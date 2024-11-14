import { transferChecked, TOKEN_2022_PROGRAM_ID, getAccount, getTransferFeeAmount } from "@solana/spl-token";
import { Connection, PublicKey, Keypair, TransactionSignature } from "@solana/web3.js";

// TRANSFER TOKENS 
export async function transferTokens(
    connection: Connection,
    sourceAccount: PublicKey,
    destinationAccount: PublicKey,
    mint: PublicKey, // mint account, tokens come from here
    sourceKeypair: Keypair,
    payer: Keypair, // account that has funds to pay for the transaction
    decimals: number,
    transferAmount: bigint,
  ): Promise<TransactionSignature> {
    console.log(`Transferring ${transferAmount} with fee transaction...`);
    
    const transferSignature = await transferChecked(
        connection,
        payer,
        sourceAccount,
        mint,
        destinationAccount,
        sourceKeypair,
        transferAmount,
        decimals, // Can also be gotten by getting the mint account details with `getMint(...)`
        [],
        undefined,
        TOKEN_2022_PROGRAM_ID,
    );
    

    const sourceAccountAfterTransfer = await getAccount(
        connection,
        sourceAccount,
        undefined,
        TOKEN_2022_PROGRAM_ID,
    );
    
    const destinationAccountAfterTransfer = await getAccount(
        connection,
        destinationAccount,
        undefined,
        TOKEN_2022_PROGRAM_ID,
    );
    
    // Note that the receiver is the one who "pays" for the transfer fee.
    const withheldAmountAfterTransfer = getTransferFeeAmount(
        destinationAccountAfterTransfer,
    );
    
    console.log(`Source ${sourceAccount.toBase58()} Token Balance: ${sourceAccountAfterTransfer.amount}`);
    console.log(
        `Destination ${destinationAccount.toBase58()} Token Balance: ${destinationAccountAfterTransfer.amount}`,
    );
    console.log(
        `Withheld Transfer Fees: ${withheldAmountAfterTransfer?.withheldAmount}\n`,
    );
    return transferSignature;
}