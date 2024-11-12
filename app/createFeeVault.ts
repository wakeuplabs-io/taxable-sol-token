import { createAssociatedTokenAccountIdempotent, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import dotenv from "dotenv";
dotenv.config();

export async function createFeeVault(
  connection: Connection,
  payer: Keypair, // account that has funds to pay for the transaction
  mintKeypair: Keypair, // mint account, tokens come from here
  withdrawWithheldAuthority: PublicKey,
): Promise<PublicKey> {
    // CREATE FEE VAULT ACCOUNT
    // Fee vault" that will be the final recipient of all transfer fees.
    // For simplicity, let's make the fee vault the associated token account (ATA) of our withdrawWithheldAuthority.
    console.log("\nCreating a fee vault account...");
    
    const feeVaultAccount = await createAssociatedTokenAccountIdempotent(
    connection,
    payer,
    mintKeypair.publicKey,
    withdrawWithheldAuthority,
    { commitment: "finalized" },
    TOKEN_2022_PROGRAM_ID,
    );
    
    const initialBalance = (
        await connection.getTokenAccountBalance(feeVaultAccount, "finalized")
    ).value.amount;
    
    console.log("Current fee vault balance: " + initialBalance + "\n\n");
    return feeVaultAccount;
}