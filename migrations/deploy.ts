// Migrations are an early feature. Currently, they're nothing more than this
// single deploy script that's invoked from the CLI, injecting a provider
// configured from the workspace's Anchor.toml.

const anchor = require("@coral-xyz/anchor");

import { getAccountConfig } from "../app/config"
import { createMintWithTransferFee } from "../app/createMintWithTransferFee";
import { createFeeVault } from "../app/createFeeVault";
import { getCluster, getFeeManagerPdaAuthority } from "../app/helpers";
import { airdropIfRequired } from "@solana-developers/helpers";
import { Cluster, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";

module.exports = async function (provider) {
  // Configure client to use the provider.
  anchor.setProvider(provider);
  const cluster = await getCluster(provider.connection) as Cluster;
  const connection = new Connection(provider.connection.rpcEndpoint, "confirmed");

  // Add your deploy script here.
  const {
    payer,
    mintKeypair,
    mintAuthority,
    supplyHolder,
    transferFeeConfigAuthority,
    withdrawWithheldAuthority,
    updateMetadataAuthority,
    dao,
    creator,
  } = await getAccountConfig();

  /**
  * Create a connection and initialize a keypair if one doesn't already exists.
  * If a keypair exists, airdrop a SOL token if needed.
  */

  // Ask for airdrop if needed on devnet
  console.log(`Cluster: ${cluster}`);
  if (cluster === "devnet") {
    const newBalance = await airdropIfRequired(
        connection,
        payer.publicKey,
        0.5 * LAMPORTS_PER_SOL,
        1 * LAMPORTS_PER_SOL,
      );
      console.log(`Payer balance: ${newBalance}`);
  }
  const feeManagerPdaAuthority = getFeeManagerPdaAuthority(payer.publicKey);

  // CREATE MINT WITH TRANSFER FEE
  const mintTransactionSig = await createMintWithTransferFee(
    connection,
    mintAuthority,
    supplyHolder,
    feeManagerPdaAuthority,
    feeManagerPdaAuthority,
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
};
