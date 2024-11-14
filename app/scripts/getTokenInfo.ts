import { getFeeManagerProgram, getNetworkConfig } from "../config";
import { PublicKey } from "@solana/web3.js";
import { geCreatorAndDaoPDA, getMintInfo, getTokenAccountInfo } from "../src/helpers";
import { getTransferFeeConfig } from "@solana/spl-token";

const TOKEN_ADDRESS = "2JrU9FCnueLuBEUC6yjFYYQbhdEhWB5ic36TYkD6bJsv";

const getTokenInfoScript = async (tokenAddress: string) => {
    const {connection, cluster, program, withdrawAuthorityKeypair} = await getFeeManagerProgram()
    console.log("connected to", cluster)

    const mint =  new PublicKey(tokenAddress)
    console.log("get Mint", mint.toBase58())

    // Decimals and token info
    const mintInfo = await getMintInfo(
        connection, 
        mint
    );
    console.log('Token information', mintInfo);

    // Fees and extension info
    const feeConfig = getTransferFeeConfig(mintInfo);
    console.log('Fee config information', feeConfig);

    // Get Creator and Dao setted on Fee Manager info
    const creatorAndDaoPDA = await geCreatorAndDaoPDA(withdrawAuthorityKeypair.publicKey, mint);

    // Retrieve stored creator and dao from the program
    const creatorAndDaoInfo = await program.account.creatorAndDao.fetch(creatorAndDaoPDA, "confirmed");
    const daoTokenInfo = await getTokenAccountInfo(connection, creatorAndDaoInfo.daoTokenAccount);
    console.log('DAO to Withdraw', daoTokenInfo.owner.toBase58())
    const creatorTokenInfo = await getTokenAccountInfo(connection, creatorAndDaoInfo.creatorTokenAccount);
    console.log('Creator to Withdraw', creatorTokenInfo.owner.toBase58())
}

getTokenInfoScript(TOKEN_ADDRESS);