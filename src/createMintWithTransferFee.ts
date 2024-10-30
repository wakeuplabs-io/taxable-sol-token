import {
  sendAndConfirmTransaction,
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  TransactionSignature,
  PublicKey,
} from "@solana/web3.js";
 
import {
  ExtensionType,
  createInitializeMintInstruction,
  getMintLen,
  TOKEN_2022_PROGRAM_ID,
  createInitializeTransferFeeConfigInstruction,
} from "@solana/spl-token";
 
export async function createMintWithTransferFee(
  connection: Connection,
  mintAuthority: PublicKey,
  transferFeeConfigAuthority: PublicKey,
  withdrawWithheldAuthority: PublicKey,
  payer: Keypair, // account that has funds to pay for the transaction
  mintKeypair: Keypair, // mint account, tokens come from here
  decimals: number,
  feeBasisPoints: number,
  maxFee: bigint,
): Promise<TransactionSignature> {
  const extensions = [ExtensionType.TransferFeeConfig];
  const mintLength = getMintLen(extensions);
 
  const mintLamports =
    await connection.getMinimumBalanceForRentExemption(mintLength);
 
  console.log("Creating a transaction with transfer fee instruction...");

  const createAccountInstruction = SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mintKeypair.publicKey,
      space: mintLength,
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

  const mintTransaction = new Transaction().add(
    createAccountInstruction,
    initializeTransferFeeConfig,
    initializeMintInstruction
  );
 
  console.log("Sending transaction...");
  const signature = await sendAndConfirmTransaction(
    connection,
    mintTransaction,
    [payer, mintKeypair],
    { commitment: "finalized" },
  );
  console.log("Transaction sent");
 
  return signature;
}