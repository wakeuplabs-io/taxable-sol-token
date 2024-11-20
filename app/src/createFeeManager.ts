const anchor = require("@coral-xyz/anchor");
import { Program } from "@coral-xyz/anchor";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { FeeManager } from "./idl/fee_manager";
import idl from "./idl/fee_manager.json";
import { createAssociatedTokenAccountIdempotent, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { confirmTransaction } from "@solana-developers/helpers";
import { FEE_MANAGER_PROGRAM_ID } from "../config";

export async function createFeeManager(
  connection: Connection,
  mint: PublicKey,
  withdrawAuthorityKeypair: Keypair,
  payer: Keypair, // account that has funds to pay for the transaction
  dao: PublicKey,
  creator: PublicKey,
  provider
) {
  anchor.setProvider(provider);
  const program = new Program(idl as FeeManager);

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

  const initFeeManagerSiganture= await program.methods
      .initialize()
      .accounts({
        mint: mint,
        authority: withdrawAuthorityKeypair.publicKey,
        payer: payer.publicKey,
        dao,
        creator,
      })
      .signers([payer, withdrawAuthorityKeypair]) //Authority signer
      .rpc({commitment: "confirmed"});

    console.log(`Initialize the Fee Manager`);
    const signature = await confirmTransaction(
      connection,
      initFeeManagerSiganture
    );
    
    return signature;
}