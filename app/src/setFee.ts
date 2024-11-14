import { confirmTransaction } from "@solana-developers/helpers";
import { Connection, PublicKey, Signer } from "@solana/web3.js";
import { FeeManager } from "./idl/fee_manager";
import { Program } from "@coral-xyz/anchor";

export const setFee = async (
  connection: Connection,
  mint: PublicKey,
  feeConfigKeypair: Signer,
  feeBasisPoints: number,
  program: Program<FeeManager>
) => {
  // Call FeeManger setFees
  const setFeesSignature = await program.methods
      .setFee(feeBasisPoints)
      .accounts({
        mint,
        authority: feeConfigKeypair.publicKey,
      })
      .signers([feeConfigKeypair]) //Authority signer
      .rpc();
  await confirmTransaction(connection, setFeesSignature);

  return setFeesSignature;

}