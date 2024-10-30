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
  TYPE_SIZE,
  LENGTH_SIZE,
  createInitializeMetadataPointerInstruction,
} from "@solana/spl-token";

import {
  createInitializeInstruction,
  createUpdateFieldInstruction,
  createRemoveKeyInstruction,
  pack,
  TokenMetadata,
} from "@solana/spl-token-metadata";

import dotenv from "dotenv";
dotenv.config();

export async function createMintWithTransferFee(
  connection: Connection,
  mintAuthority: PublicKey,
  transferFeeConfigAuthority: PublicKey,
  withdrawWithheldAuthority: PublicKey,
  updateMetadataAuthority: PublicKey,
  payer: Keypair, // account that has funds to pay for the transaction
  mintKeypair: Keypair, // mint account, tokens come from here
  decimals: number,
  feeBasisPoints: number,
  maxFee: bigint,
): Promise<TransactionSignature> {

  // Metadata to store in Mint Account
  const metaData: TokenMetadata = {
    updateAuthority: updateMetadataAuthority,
    mint: mintKeypair.publicKey,
    name: process.env.TOKEN_NAME || "OPOS",
    symbol: process.env.TOKEN_SYMBOL || "OPOS",
    uri: process.env.TOKEN_URI || "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json",
    additionalMetadata: [],
  };

  // Size of MetadataExtension 2 bytes for type, 2 bytes for length
  const metadataExtension = TYPE_SIZE + LENGTH_SIZE;
  // Size of metadata
  const metadataLen = pack(metaData).length;

  const extensions = [ExtensionType.TransferFeeConfig, ExtensionType.MetadataPointer];
  const mintLen = getMintLen(extensions);
 
  const mintLamports =
    await connection.getMinimumBalanceForRentExemption(mintLen + metadataExtension + metadataLen);
 
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
  // Instruction to initialize the MetadataPointer Extension
  const initializeMetadataPointerInstruction = createInitializeMetadataPointerInstruction(
    mintKeypair.publicKey, // Mint Account address
    updateMetadataAuthority, // Authority that can set the metadata address
    mintKeypair.publicKey, // Account address that holds the metadata
    TOKEN_2022_PROGRAM_ID,
  );
  // Instruction to initialize Metadata Account data
  const initializeMetadataInstruction = createInitializeInstruction({
    programId: TOKEN_2022_PROGRAM_ID, // Token Extension Program as Metadata Program
    metadata: mintKeypair.publicKey, // Account address that holds the metadata
    updateAuthority: updateMetadataAuthority, // Authority that can update the metadata
    mint: mintKeypair.publicKey, // Mint Account address
    mintAuthority: mintAuthority, // Designated Mint Authority
    name: metaData.name,
    symbol: metaData.symbol,
    uri: metaData.uri,
  });

  const mintTransaction = new Transaction().add(
    createAccountInstruction,
    initializeMetadataPointerInstruction,
    // note: the above instructions are required before initializing the mint
    initializeTransferFeeConfig,
    initializeMintInstruction,
    initializeMetadataInstruction,
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