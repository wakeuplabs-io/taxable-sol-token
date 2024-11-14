import anchor, { Program } from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair, sendAndConfirmTransaction } from "@solana/web3.js";
import { FeeManager } from "./idl/fee_manager";
import { createAssociatedTokenAccountIdempotent, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

export async function createFeeManager(
  connection: Connection,
  mint: PublicKey,
  withdrawAuthorityKeypair: Keypair,
  payer: Keypair, // account that has funds to pay for the transaction
  dao: PublicKey,
  creator: PublicKey,
  provider
) {
  anchor.setProvider(provider)
  const program = anchor.workspace.FeeManager as Program<FeeManager>;
  console.log('Program started')
  // Create asociated token accounts
  const creatorTokenAccount = await createAssociatedTokenAccountIdempotent(
    connection,
    payer,
    mint,
    creator,
    { commitment: "confirmed" },
    TOKEN_2022_PROGRAM_ID,
  );
  console.log(`Creator Token address ${creatorTokenAccount}`)

  const daoTokenAccount = await createAssociatedTokenAccountIdempotent(
    connection,
    payer,
    mint,
    dao,
    { commitment: "confirmed" },
    TOKEN_2022_PROGRAM_ID,
  );
  console.log(`DAO Token address ${daoTokenAccount}`)

  const initFeeManagerDestinationTx = await program.methods
      .initialize()
      .accounts({
        mint: mint,
        authority: withdrawAuthorityKeypair.publicKey,
        payer: payer.publicKey,
        dao,
        creator,
      })
      .signers([payer, withdrawAuthorityKeypair]) //Authority signer
      .transaction();

    const signature = await sendAndConfirmTransaction(
      connection, 
      initFeeManagerDestinationTx, 
      [payer, withdrawAuthorityKeypair], 
      {commitment:"confirmed"}
    );
    
    return signature;
}