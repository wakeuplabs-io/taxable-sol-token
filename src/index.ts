import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { addKeypairToEnvFile, getKeypairFromEnvironment, airdropIfRequired } from "@solana-developers/helpers";
import { transferCheckedWithFee } from "@solana/spl-token";
import { createMintWithTransferFee } from "./createMintWithTransferFee";
import dotenv from "dotenv";
dotenv.config();
 

const cluster = "devnet";
/**
 * Create a connection and initialize a keypair if one doesn't already exists.
 * If a keypair exists, airdrop a SOL token if needed.
 */
const connection = new Connection(clusterApiUrl(cluster), "confirmed");
// Next, we use an account that will deploy the contracts
let payer = getKeypairFromEnvironment('PRIVATE_KEY');
// If account does not exists create it
if (!payer) {
    payer = Keypair.generate();
    await addKeypairToEnvFile(payer, 'PRIVATE_KEY');
}
console.log(`Payer public key: ${payer.publicKey.toBase58()}`);

// Ask for airdrop if needed on devnet
if (cluster === "devnet") {
    const newBalance = await airdropIfRequired(
        connection,
        payer.publicKey,
        0.5 * LAMPORTS_PER_SOL,
        1 * LAMPORTS_PER_SOL,
      );
      console.log(`Payer balance: ${newBalance}`);
}


// We will have an authority account that will be able to update the program, update fees and mint authority
const mintAuthority = process.env.MINT_AUTHORITY ? new PublicKey(process.env.MINT_AUTHORITY) : payer.publicKey;
console.log(`mintAuthority public key: ${mintAuthority.toBase58()}`);
const transferFeeConfigAuthority = process.env.TRANSFER_FEE_CONFIG_AUTHORITY ? new PublicKey(process.env.TRANSFER_FEE_CONFIG_AUTHORITY) : payer.publicKey;
console.log(`transferFeeConfigAuthority public key: ${transferFeeConfigAuthority.toBase58()}`);
const withdrawWithheldAuthority = process.env.WITHDRAW_AUTHORITY ? new PublicKey(process.env.WITHDRAW_AUTHORITY) : payer.publicKey;
console.log(`withdrawWithheldAuthority public key: ${withdrawWithheldAuthority.toBase58()}`);
const updateMetadataAuthority = process.env.UPDATE_METADATA_AUTHORITY ? new PublicKey(process.env.UPDATE_METADATA_AUTHORITY) : payer.publicKey;
console.log(`withdrawWithheldAuthority public key: ${updateMetadataAuthority.toBase58()}`);

 
// mint account, this will be the token address
const mintKeypair = Keypair.generate();
await addKeypairToEnvFile(mintKeypair, 'MINT_KEYPAIR');
const mint = mintKeypair.publicKey;
console.log("\nmint public key: " + mintKeypair.publicKey.toBase58() + "\n\n");


const decimals = Number(process.env.DECIMALS || 8);
// fee to collect on transfers in basis points, equivalent to 1%
// Don't use ur brain, use https://www.omnicalculator.com/finance/basis-point
const feeBasisPoints = Number(process.env.FEE_BASIS_POINTS || 100);
// maximum fee to collect on transfers
const maxFee = BigInt(process.env.MAX_FEE || "18446744073709551615"); // Max u64 value
 
// CREATE MINT WITH TRANSFER FEE
const mintTransactionSig = await createMintWithTransferFee(
    connection,
    mintAuthority,
    transferFeeConfigAuthority,
    withdrawWithheldAuthority,
    updateMetadataAuthority,
    payer,
    mintKeypair,
    decimals,
    feeBasisPoints,  
    maxFee, 
)
 
console.log(
    'Token created!',
    `https://solana.fm/tx/${mintTransactionSig}?cluster=devnet-solana`
  );

// CREATE FEE VAULT ACCOUNT
 
// CREATE A SOURCE ACCOUNT AND MINT TOKEN
 
// CREATE DESTINATION ACCOUNT
 
// TRANSFER TOKENS
 
// FETCH ACCOUNTS WITH WITHHELD TOKENS
 
// WITHDRAW WITHHELD TOKENS
 
// VERIFY UPDATED FEE VAULT BALANCE
 
// HARVEST WITHHELD TOKENS TO MINT
 
// WITHDRAW HARVESTED TOKENS
 
// VERIFY UPDATED FEE VAULT BALANCE