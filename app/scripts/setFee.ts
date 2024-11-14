import { getFeeManagerProgram } from "../config";
import { setFee } from "../src/setFee";

const NEW_FEE=111;

const setFeeScript = async (newFee: number) => {
    const {
        cluster,
        connection,
        program,
        mint,
        transferFeeConfigKeypair
    } = await getFeeManagerProgram();

    const signedTx = await setFee(
        connection,
        mint,
        transferFeeConfigKeypair,
        newFee,
        program,
    );

    console.log(
        `Set Fees successful!\n`,
        `https://solana.fm/tx/${signedTx}?cluster=${cluster}-solana \n`
    );
}

setFeeScript(NEW_FEE);