import { getAccount, getTransferFeeAmount, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";


export const getTokenAccountBalance = async (connection: Connection, account: PublicKey) => {
  const tokenAmount = await connection.getTokenAccountBalance(account);
  return BigInt(tokenAmount.value.amount);
}

export const getWithledTransferFees = async (connection: Connection,destinationAccount: PublicKey) => {
  const withheldFees = getTransferFeeAmount(
    await getAccount(
        connection, 
        destinationAccount,
        undefined,
        TOKEN_2022_PROGRAM_ID
    ),
  );
  return withheldFees?.withheldAmount || 0n
}