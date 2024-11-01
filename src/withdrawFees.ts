import { TOKEN_2022_PROGRAM_ID, unpackAccount, getTransferFeeAmount, withdrawWithheldTokensFromAccounts } from "@solana/spl-token";
import { Connection, PublicKey, Signer } from "@solana/web3.js";

export const getAccountsWithheldTokens = async (connection: Connection, mint: PublicKey) => {
  // grabs all of the token accounts for a given mint
  const accounts = await connection.getProgramAccounts(TOKEN_2022_PROGRAM_ID, {
    commitment: "confirmed",
    filters: [
      {
        memcmp: {
          offset: 0,
          bytes: mint.toString(),
        },
      },
    ],
  });
  
  const accountsToWithdrawFrom: Array<PublicKey> = [];
  for (const accountInfo of accounts) {
    const unpackedAccount = unpackAccount(
      accountInfo.pubkey,
      accountInfo.account,
      TOKEN_2022_PROGRAM_ID,
    );
  
    // If there is withheld tokens add it to our list
    const transferFeeAmount = getTransferFeeAmount(unpackedAccount);
    if (
      transferFeeAmount != null &&
      transferFeeAmount.withheldAmount > BigInt(0)
    ) {
      accountsToWithdrawFrom.push(accountInfo.pubkey);
    }
  }
  return accountsToWithdrawFrom;
}

export const withdrwalAllFees = async (
  connection: Connection,
  payer: Signer,
  mint: PublicKey,
  destination: PublicKey,
  withdrawWithheldAuthority: Signer,

) => {
  const accountsToWithdrawFrom = await getAccountsWithheldTokens(connection, mint);

  if (accountsToWithdrawFrom.length === 0) {
    console.log('No accounts to withdraw from: no transfers have been made');
    return undefined;
  } else {
    console.log('Found', accountsToWithdrawFrom.length, 'accounts to withdraw from 🤑');
  }

  const withdrawFeesSignature = await withdrawWithheldTokensFromAccounts(
    connection,
    payer,
    mint,
    destination,
    withdrawWithheldAuthority,
    [],
    accountsToWithdrawFrom,
    { commitment: "finalized" },
    TOKEN_2022_PROGRAM_ID,
  );
  return withdrawFeesSignature;
}