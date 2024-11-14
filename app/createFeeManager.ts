const anchor = require("@coral-xyz/anchor");
import { Program } from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { FeeManager } from "../target/types/fee_manager";
import { createAssociatedTokenAccountIdempotent, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { confirmTransaction } from "@solana-developers/helpers";

export async function createFeeManager(
  connection: Connection,
  mint: PublicKey,
  feeManagerKeypair: Keypair,
  payer: Keypair, // account that has funds to pay for the transaction
  dao: PublicKey,
  creator: PublicKey,
  provider
) {
  anchor.setProvider(provider)
  const program = anchor.workspace.FeeManager as Program<FeeManager>;

  // Create asociated token accounts
  const creatorTokenAccount = await createAssociatedTokenAccountIdempotent(
    connection,
    payer,
    mint,
    creator,
    { commitment: "confirmed" },
    TOKEN_2022_PROGRAM_ID,
  );

  const daoTokenAccount = await createAssociatedTokenAccountIdempotent(
    connection,
    payer,
    mint,
    dao,
    { commitment: "confirmed" },
    TOKEN_2022_PROGRAM_ID,
  );

  const tx = await program.methods
      .initialize()
      .accounts({
        mintAccount: mint,
        authority: feeManagerKeypair.publicKey,
        payer: payer.publicKey,
        dao,
        creator,
      })
      .signers([payer, feeManagerKeypair]) //Authority signer
      .rpc();
    await confirmTransaction(connection, tx);
    
    return tx;
}