import { getAccountConfig, getFeeManagerProgram } from "../config";
import { withdrwalAllFees } from "../src/withdrawFees";


const harvestAndWithdraw = async () => {
    const {cluster, connection, program} = await getFeeManagerProgram()
    const {payer, mint, creator, dao, withdrawAuthorityKeypair} = await getAccountConfig();

    const signedTx = await withdrwalAllFees(
        connection,
        payer,
        mint,
        withdrawAuthorityKeypair,
        creator,
        dao,
        program,
    );

    console.log(
        `Withdraw successful!\n`,
        `https://solana.fm/tx/${signedTx}?cluster=${cluster}-solana \n`
    );
}

harvestAndWithdraw();