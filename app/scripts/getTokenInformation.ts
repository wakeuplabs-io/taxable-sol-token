import { getNetworkConfig } from "../config";
import { PublicKey } from "@solana/web3.js";
import { getMintInfo } from "../src/helpers";

const TOKEN_ADDRESS = "2JrU9FCnueLuBEUC6yjFYYQbhdEhWB5ic36TYkD6bJsv";

const getTokenInformation = async (tokenAddress: string) => {
    const {connection, cluster} = getNetworkConfig()
    console.log("connected to", cluster)

    const mint =  new PublicKey(tokenAddress)
    console.log("get Mint", mint.toBase58())
    const mintInfo = await getMintInfo(
        connection, 
        mint
    );

    console.log('Token information', mintInfo);
}

getTokenInformation(TOKEN_ADDRESS);