import { getKeypairFromEnvironment, addKeypairToEnvFile } from "@solana-developers/helpers";
import { Cluster, clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import dotenv from "dotenv";
dotenv.config();

function toCluster(clusterString: string): Cluster {
    if (clusterString === "mainnet-beta" || 
        clusterString === "devnet" || 
        clusterString === "testnet") {
        return clusterString as Cluster;
    }
    throw new Error("Invalid cluster");
}

export const getNetworkConfig = () => {
    // Network config
    const cluster: Cluster = toCluster(process.env.CLUSTER || "devnet");
    const connection = new Connection(clusterApiUrl(cluster), "confirmed");

    return {
        cluster,
        connection,
    }
}
export const getTokenConfig = () => {
    // Token Config
    const decimals = Number(process.env.DECIMALS || 8);
    const maxSupply = BigInt(process.env.MAX_SUPPLY || 100_000_000 * 10 ** decimals);
    // fee to collect on transfers in basis points, equivalent to 1%
    // Don't use ur brain, use https://www.omnicalculator.com/finance/basis-point
    const feeBasisPoints = Number(process.env.FEE_BASIS_POINTS || 100);
    // maximum fee to collect on transfers
    const maxFee = BigInt(process.env.MAX_FEE || "18446744073709551615"); // Max u64 value
    // Metadata
    const name = process.env.TOKEN_NAME || "OPOS";
    const symbol = process.env.TOKEN_SYMBOL || "OPOS";
    const uri = process.env.TOKEN_URI || "https://raw.githubusercontent.com/solana-developers/opos-asset/main/assets/DeveloperPortal/metadata.json";
    const additionalMetadata = [];

    return {
        decimals,
        maxSupply,
        feeBasisPoints,
        maxFee,
        name,
        symbol,
        uri,
        additionalMetadata,
    }
}

export const getAccountConfig = async () => {
    // Accounts config
    // Account that will deploy the contracts
    let payer: Keypair;
    // If account does not exists create it
    if (!process.env.PRIVATE_KEY) {
        payer = Keypair.generate();
        await addKeypairToEnvFile(payer, 'PRIVATE_KEY');
    } else {
        payer = getKeypairFromEnvironment('PRIVATE_KEY');
    }
    console.log(`Payer public key: ${payer.publicKey.toBase58()}`);

    // mint account, this will be the token address
    // If account does not exists create it
    let mintKeypair: Keypair;
    if (!process.env.MINT_KEYPAIR) {
        mintKeypair = Keypair.generate();
        await addKeypairToEnvFile(mintKeypair, 'MINT_KEYPAIR');
    } else {
        mintKeypair = getKeypairFromEnvironment('MINT_KEYPAIR');
    }
    console.log("\nmint public key: " + mintKeypair.publicKey.toBase58() + "\n\n");

    // We will have an authority account that will be able to update the program, update fees and mint authority
    // MintAuhtority will not actually be used since we will mint max supply and then remove the minter
    const mintAuthority = process.env.MINT_AUTHORITY ? new PublicKey(process.env.MINT_AUTHORITY) : payer.publicKey;
    console.log(`mintAuthority public key: ${mintAuthority.toBase58()}`);
    const supplyHolder = process.env.SUPPLY_HOLDER ? new PublicKey(process.env.SUPPLY_HOLDER) : payer.publicKey;
    console.log(`supplyHolder public key: ${supplyHolder.toBase58()}`);
    const transferFeeConfigAuthority = process.env.TRANSFER_FEE_CONFIG_AUTHORITY ? new PublicKey(process.env.TRANSFER_FEE_CONFIG_AUTHORITY) : payer.publicKey;
    console.log(`transferFeeConfigAuthority public key: ${transferFeeConfigAuthority.toBase58()}`);
    const withdrawWithheldAuthority = process.env.WITHDRAW_AUTHORITY ? new PublicKey(process.env.WITHDRAW_AUTHORITY) : payer.publicKey;
    console.log(`withdrawWithheldAuthority public key: ${withdrawWithheldAuthority.toBase58()}`);
    const updateMetadataAuthority = process.env.UPDATE_METADATA_AUTHORITY ? new PublicKey(process.env.UPDATE_METADATA_AUTHORITY) : payer.publicKey;
    console.log(`withdrawWithheldAuthority public key: ${updateMetadataAuthority.toBase58()}`);
    
    return {
        payer,
        mintKeypair,
        mintAuthority,
        supplyHolder,
        transferFeeConfigAuthority,
        withdrawWithheldAuthority,
        updateMetadataAuthority
    };
}

