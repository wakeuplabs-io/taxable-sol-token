import { clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import { addKeypairToEnvFile, getKeypairFromEnvironment, initializeKeypair } from "@solana-developers/helpers";
import { transferCheckedWithFee } from "@solana/spl-token";
import { createMintWithTransferFee } from "./createMintWithTransferFee";
 
/**
 * Create a connection and initialize a keypair if one doesn't already exists.
 * If a keypair exists, airdrop a SOL token if needed.
 */
const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
// Next, we use a funded account that will deploy the contracts
const payer = getKeypairFromEnvironment('PRIVATE_KEY');
//const payer = await initializeKeypair(connection);
console.log(`Payer public key: ${payer.publicKey.toBase58()}`);

// We will have an authority account that will be able to update the program, update fees and mint authority
const authority = new PublicKey("BbsHjhFUTJj17zghuLLAYpQqnuq97LVUrxEoSq5Nj6HP");
console.log(`Authority public key: ${authority.toBase58()}`);
 
// mint account, this will be the token address
const mintKeypair = Keypair.generate();
await addKeypairToEnvFile(mintKeypair, 'MINT_KEYPAIR');
const mint = mintKeypair.publicKey;
console.log("\nmint public key: " + mintKeypair.publicKey.toBase58() + "\n\n");


const decimals = 9;
// fee to collect on transfers in basis points, equivalent to 1%
// Don't use ur brain, use https://www.omnicalculator.com/finance/basis-point
const feeBasisPoints = 100;
// maximum fee to collect on transfers
const maxFee = BigInt("18446744073709551615"); // Max u64 value
 
// CREATE MINT WITH TRANSFER FEE
const mintTransactionSig = await createMintWithTransferFee(
    connection,
    authority,
    authority,
    authority,
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