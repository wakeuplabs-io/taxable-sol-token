import { PublicKey } from "@solana/web3.js";
import { getFeeManagerProgram } from "../config";
import { setDestination } from "../src/setDestination";

const ORIGINAL_DAO = 'EGHpr43g5pVEejZBhv5tgFBP8mUwKQTTRYmcy77xTGsi'
const ORIGINAL_CREATOR = 'H9JodAfzTgsfXoRKSfQ2u2Xbaj89copJ84nb1oJsmMZC'

const NEW_DAO='GWPCmWX54wP7ZVf16aY7WeoiHsAUb8AvEDDHAqbg1NAp';
const NEW_CREATOR='ziKwjx7vov5s9dym7s6TqvNfhpEdXq7oFwJzh85Y7ZB';

const setDestinationScript = async (newDaoAddress: string, newCreatorAddress: string) => {
    const newDao = new PublicKey(newDaoAddress);
    const newCreator = new PublicKey(newCreatorAddress);
    const {
        cluster,
        connection,
        program,
        payer,
        mint,
        withdrawAuthorityKeypair
    } = await getFeeManagerProgram();

    const signedTx = await setDestination(
        connection,
        payer,
        mint,
        withdrawAuthorityKeypair,
        newDao,
        newCreator,
        program,
    );

    console.log(
        `Set Destination successful!\n`,
        `https://solana.fm/tx/${signedTx}?cluster=${cluster}-solana \n`
    );
}

setDestinationScript(NEW_DAO, NEW_CREATOR);