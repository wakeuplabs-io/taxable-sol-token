import anchor, { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { getKeypairFromEnvironment, addKeypairToEnvFile, getKeypairFromFile } from "@solana-developers/helpers";
import { Cluster, clusterApiUrl, Connection, Keypair, PublicKey } from "@solana/web3.js";
import dotenv from "dotenv";
dotenv.config();
import {FeeManager} from "./src/idl/fee_manager";
import idl from "./src/idl/fee_manager.json";

export const FEE_MANAGER_PROGRAM_ID = new PublicKey(idl.address);

export function toCluster(clusterString: string): Cluster {
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
        connection
    }
}

export const getFeeManagerProgram = async() => {    // Get Program
    const networkConfig = getNetworkConfig();
    const accountConfig = await getAccountConfig()

    const wallet = new Wallet(accountConfig.payer)
    // set the local provider
    const provider = new AnchorProvider(networkConfig.connection, wallet, {
        commitment: "confirmed",
    });
    anchor.setProvider(provider) 
    const program = new Program(idl as FeeManager);

    return {
        wallet,
        provider,
        program,
        ...networkConfig,
        ...accountConfig,
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
    const payer = await getKeypairFromFile('~/.config/solana/id.json');
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
    const mint =  mintKeypair.publicKey;
    console.log("mint public key: " + mint.toBase58() + "\n");

    // Account that will hold the supply of tokens pre minted
    const supplyHolder = process.env.SUPPLY_HOLDER ? new PublicKey(process.env.SUPPLY_HOLDER) : payer.publicKey;
    console.log(`supplyHolder public key: ${supplyHolder.toBase58()}`);
   
    // We will have an authority account that will be able to update the program, update fees and mint authority
    // MintAuhtority will not actually be used since we will mint max supply and then remove the minter
    const mintAuthority = process.env.MINT_AUTHORITY ? new PublicKey(process.env.MINT_AUTHORITY) : payer.publicKey;
    console.log(`mintAuthority public key: ${mintAuthority.toBase58()}`);

    // Fee Manager
    const dao = process.env.DAO ? new PublicKey(process.env.DAO) : payer.publicKey;
    console.log(`dao public key: ${dao.toBase58()}`);
    const creator = process.env.CREATOR ? new PublicKey(process.env.CREATOR) : payer.publicKey;
    console.log(`creator public key: ${creator.toBase58()}`);
    

    // Accounts for testing purposes
    const supplyHolderKeypair: Keypair = process.env.SUPPLY_HOLDER_KEYPAIR ? getKeypairFromEnvironment('SUPPLY_HOLDER_KEYPAIR') : payer;
    console.log(`supplyHolderKeypair public key: ${supplyHolderKeypair.publicKey.toBase58()}`);
    const withdrawAuthorityKeypair: Keypair = process.env.WITHDRAW_AUTHORITY_KEYPAIR ? getKeypairFromEnvironment('WITHDRAW_AUTHORITY_KEYPAIR') : payer;
    console.log(`withdrawAuthorityKeypair public key: ${withdrawAuthorityKeypair.publicKey.toBase58()}`);
    const transferFeeConfigKeypair = process.env.TRANSFER_FEE_CONFIG_KEYPAIR ? getKeypairFromEnvironment('TRANSFER_FEE_CONFIG_KEYPAIR') : payer;
    const transferFeeConfigAuthority = transferFeeConfigKeypair.publicKey;
    console.log(`transferFeeConfigAuthority public key: ${transferFeeConfigAuthority.toBase58()}`);

    const updateMetadataAuthorityKeypair: Keypair = process.env.METADATA_AUTHORITY_KEYPAIR ? getKeypairFromEnvironment('METADATA_AUTHORITY_KEYPAIR') : payer;
    console.log(`withdrawAuthorityKeypair public key: ${updateMetadataAuthorityKeypair.publicKey.toBase58()}`);
    

    console.log("\n\n")
    return {
        payer,
        //token
        mintKeypair,
        mint,
        supplyHolder,
        mintAuthority,
        transferFeeConfigAuthority,
        //fee manager
        dao,
        creator,
        // test accounts
        supplyHolderKeypair,
        withdrawAuthorityKeypair,
        transferFeeConfigKeypair,
        updateMetadataAuthorityKeypair,
    };
}

