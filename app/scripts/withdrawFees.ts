import { getFeeManagerProgram } from "../config";
import { geCreatorAndDaoPDA, getTokenAccountInfo } from "../src/helpers";
import { withdrwalAllFees } from "../src/withdrawFees";


const harvestAndWithdraw = async () => {
    const {
        cluster,
        connection,
        program,
        payer,
        mint,
        withdrawAuthorityKeypair
    } = await getFeeManagerProgram();

    // Get creator and DAO PDA
    const creatorAndDaoPDA = await geCreatorAndDaoPDA(withdrawAuthorityKeypair.publicKey, mint);

    // Retrieve stored creator and dao from the program
    const creatorAndDaoInfo = await program.account.creatorAndDao.fetch(creatorAndDaoPDA, "confirmed");
    const daoTokenInfo = await getTokenAccountInfo(connection, creatorAndDaoInfo.daoTokenAccount);
    const dao = daoTokenInfo.owner;
    console.log('DAO to Withdraw', dao.toBase58())
    const creatorTokenInfo = await getTokenAccountInfo(connection, creatorAndDaoInfo.creatorTokenAccount);
    const creator = creatorTokenInfo.owner;
    console.log('Creator to Withdraw', creator.toBase58())

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