import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";
import { getAccountConfig, getNetworkConfig, getTokenConfig } from "../app/config";
import { createAccount, TOKEN_2022_PROGRAM_ID, mintTo, getTransferFeeAmount, getAccount, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotent, unpackAccount, createTransferInstruction, AuthorityType, createAssociatedTokenAccountInstruction, createInitializeInstruction, createInitializeMetadataPointerInstruction, createInitializeMintInstruction, createInitializeTransferFeeConfigInstruction, createMintToInstruction, createSetAuthorityInstruction, ExtensionType, getAssociatedTokenAddress, getMintLen, LENGTH_SIZE, TYPE_SIZE } from "@solana/spl-token";
import { transferTokens } from "../app/src/transferTokens";
import { getCluster, getTokenAccountBalance, getWithledTransferFees } from "../app/src/helpers";
import { withdrwalAllFees } from "../app/src/withdrawFees";
import { assert } from "chai";
import { createFeeVault } from "../app/src/createFeeVault";
import { createMintWithTransferFee } from "../app/src/createMintWithTransferFee";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { TokenMetadata, pack } from "@solana/spl-token-metadata";


describe.skip("token spl2022 test", async () => {
  // CREATE TEST ACCOUNTS, MINT TOKENS, TRANSFERS THEM AND COLECT FEES
  // Get .env configuration
   // Configure client to use the provider.
   const provider = anchor.AnchorProvider.env();
   const connection = new Connection(provider.connection.rpcEndpoint, "confirmed");
   anchor.setProvider(provider);

  const { decimals, feeBasisPoints } = getTokenConfig();
  const payer = (provider.wallet as NodeWallet).payer; //payer

  // Generate new keypair for Mint Account
  const mintKeypair = Keypair.generate();
  // Address for Mint Account
  const mint = mintKeypair.publicKey;
  // Authority
  const mintAuthority = payer.publicKey;
  const withdrawWithheldAuthority = payer.publicKey;
  const transferFeeConfigAuthority = payer.publicKey;
  const supplyHolder = payer.publicKey;
  const supplyHolderKeypair = payer;
  const withdrawAuthorityKeypair = payer;
  const sourceKeypair = supplyHolderKeypair;

  let sourceAccount: PublicKey;
  const destinationKeypair = Keypair.generate();
  let destinationAccount: PublicKey;
  let initialSourceBalance: bigint;
  let feeVaultAccount: PublicKey;


  it("Should CREATE MINT WITH TRANSFER FEE", async () => {
    // CREATE MINT WITH TRANSFER FEE
    const {
      decimals,
      maxSupply,
      feeBasisPoints,  
      maxFee, 
      name,
      symbol,
      uri,
      additionalMetadata,
  } =  getTokenConfig();
  
    // Size of Mint Account with extensions
    const mintLen = getMintLen([ExtensionType.TransferFeeConfig]);
    // Minimum lamports required for Mint Account
    const mintLamports = await connection.getMinimumBalanceForRentExemption(mintLen);
  
    console.log("Creating a transaction with transfer fee instruction...");
  
    const createAccountInstruction = SystemProgram.createAccount({
        fromPubkey: payer.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: mintLen,
        lamports: mintLamports,
        programId: TOKEN_2022_PROGRAM_ID,
      });
  
    const initializeTransferFeeConfig = createInitializeTransferFeeConfigInstruction(
      mintKeypair.publicKey,
      transferFeeConfigAuthority,
      withdrawWithheldAuthority,
      feeBasisPoints,
      maxFee,
      TOKEN_2022_PROGRAM_ID,
    );
    
  
    const initializeMintInstruction = createInitializeMintInstruction(
      mintKeypair.publicKey,
      decimals,
      mintAuthority,
      null,
      TOKEN_2022_PROGRAM_ID,
    );

  
    // Create Associated Token Account instruction (if needed)
    const associatedTokenAccount = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      supplyHolder,
      false,
      TOKEN_2022_PROGRAM_ID
    );
  
    const createAtaInstruction = createAssociatedTokenAccountInstruction(
      payer.publicKey,
      associatedTokenAccount,
      supplyHolder,
      mintKeypair.publicKey,
      TOKEN_2022_PROGRAM_ID
    );
  
    // Mint the total fixed supply instruction
    const mintMaxSupplyInstruction = createMintToInstruction(
      mintKeypair.publicKey,           // mint
      associatedTokenAccount,          // destination
      mintAuthority,                   // authority
      maxSupply,  // amount
      [],                              // signers //this is empty because the payer is the mintAuthority
      TOKEN_2022_PROGRAM_ID
    );
  
    // Create instruction to remove mint authority
    const removeMintAuthorityInstruction = createSetAuthorityInstruction(
      mintKeypair.publicKey,           // mint account
      mintAuthority,                   // current authority
      AuthorityType.MintTokens,        // authority type
      null,                           // new authority (null to remove)
      [],                             // multi signature
      TOKEN_2022_PROGRAM_ID
    );
  
    const mintTransaction = new Transaction().add(
      createAccountInstruction,
      initializeTransferFeeConfig,
      initializeMintInstruction,
      createAtaInstruction,
      mintMaxSupplyInstruction,
      removeMintAuthorityInstruction,
    );
   
    console.log("Sending transaction...");
    await sendAndConfirmTransaction(
      connection,
      mintTransaction,
      [payer, mintKeypair],
      { commitment: "confirmed" },
    );
  })

  it("Should CREATE FEE VAULT ACCOUNT", async () => {
    // CREATE FEE VAULT ACCOUNT
    await createFeeVault(connection, payer, mintKeypair, withdrawWithheldAuthority)
  })

  it("Should CREATE A SOURCE ACCOUNT", async () => {
    console.log("createAssociatedTokenAccountIdempotent")
    // CREATE A SOURCE ACCOUNT
    sourceAccount = await createAssociatedTokenAccountIdempotent(
      connection,
      payer,
      mint,
      sourceKeypair.publicKey,
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID,
    );
    initialSourceBalance = await getTokenAccountBalance(connection, sourceAccount);
    console.log("created source asociated acount")
    // CREATE DESTINATION ACCOUNT
    destinationAccount = await createAccount(
      connection,
      payer,
      mint,
      destinationKeypair.publicKey,
      undefined,
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID,
    );
    console.log("created source asociated acount")

    // Get Fee Vault
    feeVaultAccount = getAssociatedTokenAddressSync(
      mint,
      withdrawWithheldAuthority,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );
    console.log("get fee vault asociated acount")
  });

  it("Should MINT TOKENS", async () => {
    
    /**
     * Create a connection and initialize a keypair if one doesn't already exists.
     * If a keypair exists, airdrop a SOL token if needed.
     */
    

    // MINT TOKENS
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
        assert.equal(sourceBalanceAfterMint - initialSourceBalance, amountToMint)
        assert.fail("Mint is active and it shouldn't")
    } catch (err){
        console.log("Mint is correctly deactivated\n\n")
    }
  })

  it("Should TRANSFER THEM AND COLECT FEES", async () => {
    
    const initialDestinationBalance = await getTokenAccountBalance(connection, destinationAccount);


    //*******************/
    // TRANSFER TOKENS
    //*******************/
    const transferAmount = BigInt(1 * 10 ** decimals);
    await transferTokens(
        connection,
        sourceAccount,
        destinationAccount,
        mint,
        sourceKeypair,
        payer,
        decimals,
        transferAmount
    );

    const finalSourceBalance = await getTokenAccountBalance(connection, sourceAccount);
    const finalDestinationBalance = await getTokenAccountBalance(connection, destinationAccount);

    // We don't take max fee into acount as it has the max u64 value
    const expectedFee = (transferAmount * BigInt(feeBasisPoints)) / BigInt(10_000);
    // Note that the receiver is the one who "pays" for the transfer fee.
    // Witheld amount is not yet in the vault and needs to be harvested from accounts in order to be withdraw
    const withheldFees = await getWithledTransferFees(connection, destinationAccount);
    console.log(`Whitheld Token Fees after transfer ${withheldFees}`)
    assert.equal(expectedFee, withheldFees, `Expected withheld fee are ${withheldFees} but should be ${expectedFee}`);


    assert.equal(initialSourceBalance - finalSourceBalance, transferAmount, `Expected source balance to be equal to transferAmount`);

    // Note that the receiver is the one who "pays" for the transfer fee.
    assert.equal(finalDestinationBalance - initialDestinationBalance, transferAmount - expectedFee, `Expected destination balance to be equal to transferAmount - fee`);

  })

  it("Should COLECT FEES", async () => {

    const initialFeeVaultBalance = await getTokenAccountBalance(connection, feeVaultAccount);
    const withheldFees = await getWithledTransferFees(connection, destinationAccount);
    //*******************/
    // FETCH ACCOUNTS AND WITHDRAW WITHHELD TOKENS
    //*******************/
    console.log('\n\n Withdrawing all fees...')
    await withdrwalAllFees(
      connection,
      payer,
      mint,
      feeVaultAccount,
      withdrawAuthorityKeypair,
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
    assert.equal(withheldAmountAfterWithdraw?.withheldAmount, BigInt(0));
    console.log(
      `Fee vault balance after withdraw: ${feeVaultAfterWithdraw.amount}\n`,
    );
    const finalFeeVaultBalance = feeVaultAfterWithdraw.amount;
    assert.equal(withheldFees, finalFeeVaultBalance - initialFeeVaultBalance);

  });
});