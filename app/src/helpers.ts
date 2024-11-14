import { createAssociatedTokenAccountIdempotent, getAccount, getMint, getTransferFeeAmount, getTransferFeeConfig, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { Cluster, Connection, PublicKey, Signer } from "@solana/web3.js";
import { getFeeManagerProgram } from "../config";

export const getOrCreateATA = async (connection: Connection, payer: Signer, mint: PublicKey, owner: PublicKey) => {
  // Account CANT BE A PDA
  const ownerATA = await createAssociatedTokenAccountIdempotent(
      connection,
      payer,
      mint,
      owner,
      {commitment: "confirmed"},
      TOKEN_2022_PROGRAM_ID,
  );
  return ownerATA;

}


export const getFeeConfigPdaAuthority = async (authority: PublicKey) => { 
  const {program} = await getFeeManagerProgram();
  const [PDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("pda_authority"), authority.toBuffer()],
    program.programId,
  );
  return PDA;
}

export const getWithdrawPdaAuthority = async (authority: PublicKey, mint: PublicKey) => { 
  const {program} = await getFeeManagerProgram();
  const [PDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("creator_and_dao"), authority.toBuffer(), mint.toBuffer()],
    program.programId,
  );
  return PDA;
}

export const getTokenAccountBalance = async (connection: Connection, account: PublicKey) => {
  const tokenAmount = await connection.getTokenAccountBalance(account, "confirmed");
  return BigInt(tokenAmount.value.amount);
}

export const getMintInfo = async (connection: Connection, mint: PublicKey) => {
  return getMint(
    connection, 
    mint,
    "confirmed",
    TOKEN_2022_PROGRAM_ID
  );
}

export const getMintWithledTransferFees = async (connection: Connection, mint: PublicKey) => {
  const withheldFees = getTransferFeeConfig(
    await getMintInfo(
        connection, 
        mint
    ),
  );
  return withheldFees?.withheldAmount || BigInt(0)
}

export const getWithledTransferFees = async (connection: Connection, destinationAccount: PublicKey) => {
  const withheldFees = getTransferFeeAmount(
    await getAccount(
        connection, 
        destinationAccount,
        "confirmed",
        TOKEN_2022_PROGRAM_ID
    ),
  );
  return withheldFees?.withheldAmount || BigInt(0)
}

export const getCluster = async (connection: Connection): Promise<string> => {
  const genesishash = await connection.getGenesisHash();
  /**
  * Devnet: EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG
  * Testnet: 4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY
  * Mainnet-beta: 5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d
  */
 let cluster = ""
  if (genesishash === "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG") 
    cluster = "devnet";
  else if(genesishash === "4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY")
    cluster = "testnet";
  else if(genesishash === "4uhcVJyU9pJkvQyS88uRDiswHXSCkY3zQawwpjk2NsNY")
    cluster = "mainnet-beta";
  else if (cluster === "") 
    throw new Error("Unknow cluster");
  return cluster;
}