import { getFeeManagerProgram, getNetworkConfig } from "../config";
import { PublicKey } from "@solana/web3.js";
import { geCreatorAndDaoPDA, getMintInfo, getTokenAccountInfo } from "../src/helpers";
import { getTokenMetadata, getTransferFeeConfig, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";


const getTokenInfoScript = async () => {
    const {connection, cluster, program, mint, withdrawAuthorityKeypair} = await getFeeManagerProgram()
    console.log("connected to", cluster)

    console.log("get Mint", mint.toBase58())

    // Decimals and token info
    const mintInfo = await getMintInfo(
        connection, 
        mint
    );
    console.log('Token information', mintInfo, '\n');

    // Token Fees and extension info
    const feeConfig = getTransferFeeConfig(mintInfo);
    console.log('Fee config information', feeConfig, '\n');

    // Token Metadata
    const metadata  = await getTokenMetadata(connection, mint, "confirmed", TOKEN_2022_PROGRAM_ID);
    console.log('Metadata', metadata, '\n');

    // Get Creator and Dao setted on Fee Manager info
    const creatorAndDaoPDA = await geCreatorAndDaoPDA(withdrawAuthorityKeypair.publicKey, mint);

    // Retrieve stored creator and dao from the program
    const creatorAndDaoInfo = await program.account.creatorAndDao.fetch(creatorAndDaoPDA, "confirmed");
    const daoTokenInfo = await getTokenAccountInfo(connection, creatorAndDaoInfo.daoTokenAccount);
    console.log('DAO to Withdraw', daoTokenInfo.owner.toBase58())
    const creatorTokenInfo = await getTokenAccountInfo(connection, creatorAndDaoInfo.creatorTokenAccount);
    console.log('Creator to Withdraw', creatorTokenInfo.owner.toBase58())
}

getTokenInfoScript();