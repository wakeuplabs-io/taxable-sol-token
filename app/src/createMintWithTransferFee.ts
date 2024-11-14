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
  createMintToInstruction,
  createSetAuthorityInstruction,
  AuthorityType,
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
} from "@solana/spl-token";

import {
  createInitializeInstruction,
  pack,
  TokenMetadata,
} from "@solana/spl-token-metadata";
import { getTokenConfig } from "../config";

export async function createMintWithTransferFee(
  connection: Connection,
  mintAuthority: PublicKey,
  supplyHolder: PublicKey,
  transferFeeConfigAuthority: PublicKey,
  withdrawWithheldAuthority: PublicKey,
  updateMetadataAuthority: PublicKey,
  payer: Keypair, // account that has funds to pay for the transaction
  mintKeypair: Keypair, // mint account, tokens come from here
): Promise<TransactionSignature> {

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

  // Metadata to store in Mint Account 
  // https://solana.com/developers/guides/token-extensions/metadata-pointer
  const metaData: TokenMetadata = {
    updateAuthority: updateMetadataAuthority,
    mint: mintKeypair.publicKey,
    name,
    symbol,
    uri,
    additionalMetadata,
  };

  // Size of MetadataExtension 2 bytes for type, 2 bytes for length
  const metadataExtension = TYPE_SIZE + LENGTH_SIZE;
  // Size of metadata
  const metadataLen = pack(metaData).length;
  // Size of Extensions
  const extensions = [ExtensionType.TransferFeeConfig, ExtensionType.MetadataPointer];
  const mintLen = getMintLen(extensions);
 
  const totalLen = mintLen + metadataExtension + metadataLen
  console.log(`Metadata len`, metadataLen, "mintlen", mintLen, "metadataExtension", metadataExtension, "total", totalLen)
  const mintLamports =
    await connection.getMinimumBalanceForRentExemption(totalLen);
 
  const payerBalance = await connection.getBalance(payer.publicKey);
  console.log(`Mint lampors for rent exception: ${mintLamports}, Payers balance ${payerBalance}`)
  if (payerBalance <= mintLamports) {
    throw new Error("Payer does not have enough Balance");
  }

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

  // If we had aditional metada we should add it like this
  // https://solana.com/developers/guides/token-extensions/metadata-pointer
  // Instruction to update metadata, adding custom field
  //const updateFieldInstruction = createUpdateFieldInstruction({
  //  programId: TOKEN_2022_PROGRAM_ID, // Token Extension Program as Metadata Program
  //  metadata: mint, // Account address that holds the metadata
  //  updateAuthority: updateAuthority, // Authority that can update the metadata
  //  field: metaData.additionalMetadata[0][0], // key
  //  value: metaData.additionalMetadata[0][1], // value
  //});

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
    initializeMetadataPointerInstruction,
    initializeTransferFeeConfig,
    initializeMintInstruction,
    initializeMetadataInstruction,
    createAtaInstruction,
    mintMaxSupplyInstruction,
    removeMintAuthorityInstruction,
  );
 
  console.log("Sending transaction...");
  const signature = await sendAndConfirmTransaction(
    connection,
    mintTransaction,
    [payer, mintKeypair],
    { commitment: "confirmed" },
  );
  console.log("Transaction sent");

 
  return signature;
}