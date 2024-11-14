import { airdropIfRequired } from "@solana-developers/helpers";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAccountConfig, getNetworkConfig, getTokenConfig } from "../app/config";
import { createAccount, TOKEN_2022_PROGRAM_ID, mintTo, getTransferFeeAmount, getAccount, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotent, unpackAccount, createTransferInstruction } from "@solana/spl-token";
import { transferTokens } from "../app/transferTokens";
import { getTokenAccountBalance, getWithledTransferFees } from "../app/helpers";
import { withdrwalAllFees } from "../app/withdrawFees";


describe.skip("migration test", async () => {
  it("Should MINT TOKENS, TRANSFER THEM AND COLECT FEES", async () => {
    // CREATE TEST ACCOUNTS, MINT TOKENS, TRANSFERS THEM AND COLECT FEES

    // Get .env configuration
    const { cluster, connection } = getNetworkConfig();

    const { decimals, feeBasisPoints } = getTokenConfig();

    const {
        payer,
        mintKeypair,
        mintAuthority,
        transferFeeConfigAuthority,
        withdrawWithheldAuthority,
        updateMetadataAuthority,
        supplyHolderKeypair,
        withdrawAuthorityKeypair,
    } = await getAccountConfig();

    /**
     * Create a connection and initialize a keypair if one doesn't already exists.
     * If a keypair exists, airdrop a SOL token if needed.
     */

    // Ask for airdrop if needed on devnet
    if (cluster === "devnet") {
        const newBalance = await airdropIfRequired(
            connection,
            payer.publicKey,
            0.5 * LAMPORTS_PER_SOL,
            1 * LAMPORTS_PER_SOL,
          );
          console.log(`Payer balance: ${newBalance}`);
    }

    // CREATE A SOURCE ACCOUNT AND MINT TOKEN
    console.log("Creating source account...");
    
    const mint = mintKeypair.publicKey;
    const sourceKeypair = supplyHolderKeypair;
    const sourceAccount = await createAssociatedTokenAccountIdempotent(
      connection,
      payer,
      mint,
      sourceKeypair.publicKey,
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID,
    );
    console.log(`Source account ${sourceAccount.toBase58()}`);
    const initialSourceBalance = await getTokenAccountBalance(connection, sourceAccount);
    console.log(`Source account Token balance ${initialSourceBalance}`);

    // MINT TOKENS
    console.log("Should not mint tokens to source as this tokens has max supply already minted...");
    
    const amountToMint = BigInt(10 * 10 ** decimals);
    // change if mint authority is different from the payer
    const mintAuthorityKeypair = payer;
    try {
        await mintTo(
        connection,
        payer,
        mint,
        sourceAccount,
        mintAuthorityKeypair, // mintAuthority
        amountToMint,
        [payer],
        { commitment: "confirmed" },
        TOKEN_2022_PROGRAM_ID,
        );
        const sourceBalanceAfterMint = await getTokenAccountBalance(connection, sourceAccount);
        if (sourceBalanceAfterMint !== amountToMint) {
            throw new Error(`Expected source balance to be equal to amountToMint`);
        }
        throw new Error("Mint is active and it shouldn't")
    } catch (err){
        console.log("Mint is correctly deactivated\n\n")
    }



    // CREATE DESTINATION ACCOUNT
    console.log("Creating destination account...");
    
    const destinationKeypair = Keypair.generate();
    const destinationAccount = await createAccount(
      connection,
      payer,
      mint,
      destinationKeypair.publicKey,
      undefined,
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID,
    );
    console.log(`Destination account ${destinationAccount.toBase58()}`);

    const initialDestinationBalance = await getTokenAccountBalance(connection, destinationAccount);
    console.log(`Destination account Token balance ${initialDestinationBalance}`);

    // Get Fee Vault
    const feeVaultAccount = getAssociatedTokenAddressSync(
      mint,
      withdrawWithheldAuthority,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );
    const initialFeeVaultBalance = await getTokenAccountBalance(connection, feeVaultAccount);
    console.log(`Fee Vault ${feeVaultAccount} Balance ${initialFeeVaultBalance}\n\n`)

    //*******************/
    // TRANSFER TOKENS
    //*******************/
    const transferAmount = BigInt(1 * 10 ** decimals);
    const transferTransactionSig = await transferTokens(
        connection,
        sourceAccount,
        destinationAccount,
        mint,
        sourceKeypair,
        payer,
        decimals,
        transferAmount
    );
    console.log(
      `Transfer successful!\n`,
      `https://solana.fm/tx/${transferTransactionSig}?cluster=${cluster}-solana \n`
    );

    const finalSourceBalance = await getTokenAccountBalance(connection, sourceAccount);
    console.log(`Source account Token balance after transfer ${finalSourceBalance}`);
    const finalDestinationBalance = await getTokenAccountBalance(connection, destinationAccount);
    console.log(`Destination account Token balance after trasnfer ${finalDestinationBalance}`);

    // We don't take max fee into acount as it has the max u64 value
    const expectedFee = (transferAmount * BigInt(feeBasisPoints)) / BigInt(10_000);
    // Note that the receiver is the one who "pays" for the transfer fee.
    // Witheld amount is not yet in the vault and needs to be harvested from accounts in order to be withdraw
    const withheldFees = await getWithledTransferFees(connection, destinationAccount);
    console.log(`Whitheld Token Fees after transfer ${withheldFees}`)
    if (expectedFee !== withheldFees) {
        console.error(`Expected withheld fee are ${withheldFees} but should be ${expectedFee}`);
    }

    if ((initialSourceBalance - finalSourceBalance) !== transferAmount) {
        throw new Error(`Expected source balance to be equal to transferAmount`);
    }
    // Note that the receiver is the one who "pays" for the transfer fee.
    if ((finalDestinationBalance - initialDestinationBalance) !== (transferAmount - expectedFee)) {
        throw new Error(`Expected destination balance to be equal to transferAmount - fee`);
    }


    //*******************/
    // FETCH ACCOUNTS AND WITHDRAW WITHHELD TOKENS
    //*******************/
    console.log('\n\n Withdrawing all fees...')
    const withdrawTransactionSig = await withdrwalAllFees(
      connection,
      payer,
      mint,
      feeVaultAccount,
      withdrawAuthorityKeypair,
    );
    console.log(
      `Withdraw all fees successful!\n`,
      `https://solana.fm/tx/${withdrawTransactionSig}?cluster=${cluster}-solana \n`
    );

    const withheldAccountAfterWithdraw = await getAccount(
      connection,
      destinationAccount,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    const withheldAmountAfterWithdraw = getTransferFeeAmount(
      withheldAccountAfterWithdraw,
    );

    const feeVaultAfterWithdraw = await getAccount(
      connection,
      feeVaultAccount,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    console.log(
      `Withheld amount after withdraw: ${withheldAmountAfterWithdraw?.withheldAmount}`,
    );
    console.log(
      `Fee vault balance after withdraw: ${feeVaultAfterWithdraw.amount}\n`,
    );
      
      
    // VERIFY UPDATED FEE VAULT BALANCE
    const finalFeeVaultBalance = await getTokenAccountBalance(connection, feeVaultAccount);
    console.log(`Fee Vault Balance after transfer ${finalFeeVaultBalance}`);
    const fee = finalFeeVaultBalance - initialFeeVaultBalance;
    console.log('Fees withdrawed', fee, '\n\n');
  });
});