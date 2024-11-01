import { LAMPORTS_PER_SOL, } from "@solana/web3.js";
import { airdropIfRequired } from "@solana-developers/helpers";
import { createMintWithTransferFee } from "./createMintWithTransferFee";
 import { getAccountConfig, getNetworkConfig } from "./config";
import { createFeeVault } from "./createFeeVault";

// Get .env configuration
const { cluster, connection } = getNetworkConfig();

const {
    payer,
    mintKeypair,
    mintAuthority,
    supplyHolder,
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

// CREATE MINT WITH TRANSFER FEE
const mintTransactionSig = await createMintWithTransferFee(
    connection,
    mintAuthority,
    supplyHolder,
    transferFeeConfigAuthority,
    withdrawWithheldAuthority,
    updateMetadataAuthority,
    payer,
    mintKeypair,
)
 
console.log(
    'Token created!',
    `https://solana.fm/tx/${mintTransactionSig}?cluster=${cluster}-solana`
  );

// CREATE FEE VAULT ACCOUNT
await createFeeVault(connection, payer, mintKeypair, withdrawWithheldAuthority)