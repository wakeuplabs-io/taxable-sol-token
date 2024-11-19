// agregar script cambiar metadata
import { getFeeManagerProgram, getNetworkConfig } from "../config";
import { PublicKey, sendAndConfirmTransaction, Transaction } from "@solana/web3.js";
import { geCreatorAndDaoPDA, getMintInfo, getTokenAccountInfo } from "../src/helpers";
import { createUpdateFieldInstruction, getTransferFeeConfig, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

const NAME = 'AGENT Token';
const SYMBOL = 'AGENT';
const URI = 'https://token-uri.com';

const setMetadataScript = async (name: string, symbol: string, uri: string) => {
    const {connection, cluster, program, mint, payer, updateMetadataAuthorityKeypair} = await getFeeManagerProgram()
    console.log("connected to", cluster)

    console.log("get Mint", mint.toBase58())

    const updateMetadataAuthority = updateMetadataAuthorityKeypair.publicKey;
    console.log("updateMetadataAuthority", updateMetadataAuthority.toBase58())


    const updateMetadataNameFieldInstructions = createUpdateFieldInstruction({
        metadata: mint,
        updateAuthority: updateMetadataAuthority,
        programId: TOKEN_2022_PROGRAM_ID,
        field: 'name',
        value: name,
    });

    const updateMetadataSymbolFieldInstructions = createUpdateFieldInstruction({
        metadata: mint,
        updateAuthority: updateMetadataAuthority,
        programId: TOKEN_2022_PROGRAM_ID,
        field: 'symbol',
        value: symbol,
    });

    const updateMetadataUriFieldInstructions = createUpdateFieldInstruction({
        metadata: mint,
        updateAuthority: updateMetadataAuthority,
        programId: TOKEN_2022_PROGRAM_ID,
        field: 'uri',
        value: uri,
    });

    const transaction = new Transaction().add(
        updateMetadataNameFieldInstructions, 
        updateMetadataSymbolFieldInstructions,
        updateMetadataUriFieldInstructions
      );
    const signedTx = await sendAndConfirmTransaction(connection, transaction, [
        payer,
        updateMetadataAuthorityKeypair,
    ]);

    console.log(
    `Set Fees successful!\n`,
    `https://solana.fm/tx/${signedTx}?cluster=${cluster}-solana \n`
);
}

setMetadataScript(NAME, SYMBOL, URI);