import { confirmTransaction } from "@solana-developers/helpers";
import { Connection, PublicKey, Signer } from "@solana/web3.js";
import { FeeManager } from "./idl/fee_manager";
import { Program } from "@coral-xyz/anchor";
import { getOrCreateATA } from "./helpers";

export const setDestination = async (
  connection: Connection,
  payer: Signer,
  mint: PublicKey,
  withdrawAuthorityKeypair: Signer,
  newDao: PublicKey,
  newCreator: PublicKey,
  program: Program<FeeManager>
) => {

  // We need to make sure newDao ATA exists
  await getOrCreateATA(
    connection,
    payer,
    mint,
    newDao
  );

  // We need to make sure newCreator ATA exists
  await getOrCreateATA(
    connection,
    payer,
    mint,
    newCreator
  );
  // Call FeeManger setDestination
  const setDestinationSig = await program.methods
      .setDestination()
      .accounts({
        mint,
        authority: withdrawAuthorityKeypair.publicKey,
        newDao,
        newCreator,
      })
      .signers([withdrawAuthorityKeypair]) //Authority signer
      .rpc();
  await confirmTransaction(connection, setDestinationSig);

  return setDestinationSig;

}