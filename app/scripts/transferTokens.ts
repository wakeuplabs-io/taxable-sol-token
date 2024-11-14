import { PublicKey } from "@solana/web3.js";
import { getAccountConfig, getNetworkConfig } from "../config";
import { getMintInfo, getOrCreateATA } from "../src/helpers";
import { transferTokens } from "../src/transferTokens";

const DESTINATION = "ziKwjx7vov5s9dym7s6TqvNfhpEdXq7oFwJzh85Y7ZB";
const AMOUNT = 1;

const transferTokenScript = async (destinationAddres: string, amount: number) => {
    const {cluster, connection} = getNetworkConfig();
    const {payer, mint, supplyHolderKeypair} = await getAccountConfig();

    // Destination Asociated Token Account must be created if it does not exists
    const destination = new PublicKey(destinationAddres);
    const destinationATA = await getOrCreateATA(
      connection,
      payer,
      mint,
      destination
    );

    const source = supplyHolderKeypair.publicKey;
    const sourceATA = await getOrCreateATA(
      connection,
      payer,
      mint,
      source
    );

    const mintInfo = await getMintInfo(
      connection, 
      mint
    );
    const decimals = mintInfo.decimals;
    const transferAmount = BigInt(amount * 10 ** decimals);
    const transferTransactionSig = await transferTokens(
        connection,
        sourceATA,
        destinationATA,
        mint,
        supplyHolderKeypair,
        payer,
        decimals,
        transferAmount
    );
    console.log(
      `Transfer successful!\n`,
      `https://solana.fm/tx/${transferTransactionSig}?cluster=${cluster}-solana \n`
    );

}

transferTokenScript(DESTINATION, AMOUNT);