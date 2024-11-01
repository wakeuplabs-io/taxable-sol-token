import { airdropIfRequired } from "@solana-developers/helpers";
import { Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAccountConfig, getNetworkConfig, getTokenConfig } from "./config";
import { createAccount, TOKEN_2022_PROGRAM_ID, mintTo, transferChecked, getTransferFeeAmount, getAccount, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { transferTokens } from "./transferTokens";
import { getAccountBalance } from "./helpers";


// CREATE TEST ACCOUNTS, MINT TOKENS, TRANSFERS THEM AND COLECT FEES

// Get .env configuration
const { cluster, connection } = getNetworkConfig();

const { decimals, feeBasisPoints } = getTokenConfig();

const {
    payer,
    mintKeypair,
    mintAuthority,
    transferFeeConfigAuthority,
    withdrawWithheldAuthority,
    updateMetadataAuthority,
} = await getAccountConfig();

/**
 * Create a connection and initialize a keypair if one doesn't already exists.
 * If a keypair exists, airdrop a SOL token if needed.
 */

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

// CREATE A SOURCE ACCOUNT AND MINT TOKEN
console.log("Creating source account...");
 
const mint = mintKeypair.publicKey;
const sourceKeypair = Keypair.generate();
const sourceAccount = await createAccount(
  connection,
  payer,
  mint,
  sourceKeypair.publicKey,
  undefined,
  { commitment: "finalized" },
  TOKEN_2022_PROGRAM_ID,
);
console.log(`Source account ${sourceAccount.toBase58()}`);

// CREATE DESTINATION ACCOUNT
console.log("Creating destination account...");
 
const destinationKeypair = Keypair.generate();
const destinationAccount = await createAccount(
  connection,
  payer,
  mint,
  destinationKeypair.publicKey,
  undefined,
  { commitment: "finalized" },
  TOKEN_2022_PROGRAM_ID,
);
console.log(`Destination account ${destinationAccount.toBase58()}`);

// MINT TOKENS
console.log("Minting 10 tokens to source...\n\n");
 
const amountToMint = BigInt(10 * 10 ** decimals);
// change if mint authority is different from the payer
const mintAuthorityKeypair = payer;
await mintTo(
  connection,
  payer,
  mint,
  sourceAccount,
  mintAuthorityKeypair, // mintAuthority
  amountToMint,
  [payer],
  { commitment: "finalized" },
  TOKEN_2022_PROGRAM_ID,
);


const initialSourceBalance = await getAccountBalance(connection, sourceAccount);
console.log(`Source account Token balance ${initialSourceBalance}`);
const initialDestinationBalance = await getAccountBalance(connection, destinationAccount);
console.log(`Destination account Token balance ${initialDestinationBalance}`);

if (initialSourceBalance !== amountToMint) {
    throw new Error(`Expected source balance to be equal to amountToMint`);
}

const feeVaultAccount = getAssociatedTokenAddressSync(
  mint,
  payer.publicKey,
  undefined,
  TOKEN_2022_PROGRAM_ID,
);
const initialFeeVaultBalance = await getAccountBalance(connection, feeVaultAccount);

// TRANSFER TOKENS
const transferAmount = BigInt(1 * 10 ** decimals);
await transferTokens(
    connection,
    sourceAccount,
    destinationAccount,
    mint,
    sourceKeypair,
    payer,
    decimals,
    transferAmount
);

const finalFeeVaultBalance = await getAccountBalance(connection, feeVaultAccount);
const finalSourceBalance = await getAccountBalance(connection, sourceAccount);
const finalDestinationBalance = await getAccountBalance(connection, destinationAccount);

// We don't take max fee into acount as it has the max u64 value
const expectedFee = (transferAmount * BigInt(feeBasisPoints)) / BigInt(10_000);
const fee = finalFeeVaultBalance - initialFeeVaultBalance;
if (expectedFee !== fee) {
    console.error(`Expected fee are ${fee} but should be ${expectedFee}`);
}

if ((initialSourceBalance - finalSourceBalance) !== transferAmount) {
    throw new Error(`Expected source balance to be equal to transferAmount`);
}
// Note that the receiver is the one who "pays" for the transfer fee.
if ((finalDestinationBalance - initialDestinationBalance) !== (transferAmount - expectedFee)) {
    console.log('initialDestinationBalance', initialDestinationBalance)
    console.log('finalDestinationBalance', finalDestinationBalance)
    console.log('transferAmount', transferAmount)
    console.log('fee', fee)
    throw new Error(`Expected destination balance to be equal to transferAmount - fee`);
}

// FETCH ACCOUNTS WITH WITHHELD TOKENS
 
// WITHDRAW WITHHELD TOKENS
 
// VERIFY UPDATED FEE VAULT BALANCE
 
// HARVEST WITHHELD TOKENS TO MINT
 
// WITHDRAW HARVESTED TOKENS
 
// VERIFY UPDATED FEE VAULT BALANCE