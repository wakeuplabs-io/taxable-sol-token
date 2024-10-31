import { Connection, PublicKey } from "@solana/web3.js";


export const getAccountBalance = async (connection: Connection, account: PublicKey) => {
  const tokenAmount = await connection.getTokenAccountBalance(account);
  return BigInt(tokenAmount.value.amount);
}