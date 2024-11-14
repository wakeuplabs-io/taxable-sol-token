import { confirmTransaction } from "@solana-developers/helpers";
import { TOKEN_2022_PROGRAM_ID, unpackAccount, getTransferFeeAmount, withdrawWithheldTokensFromAccounts, harvestWithheldTokensToMint } from "@solana/spl-token";
import { Connection, PublicKey, Signer } from "@solana/web3.js";
import { FeeManager } from "./idl/fee_manager";
import anchor, { Program } from "@coral-xyz/anchor";
import { getMintWithledTransferFees } from "./helpers";

export const getAllAccountsWithheldTokens = async (connection: Connection, mint: PublicKey) => {
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
  withdrawAuthorityKeypair: Signer,
  creator: PublicKey,
  dao: PublicKey,
  program: Program<FeeManager>
) => {
  const accountsToWithdrawFrom = await getAllAccountsWithheldTokens(connection, mint);

  if (accountsToWithdrawFrom.length === 0) {
    console.log('No accounts to withdraw from: no transfers have been made');
    return undefined;
  } else {
    console.log('Found', accountsToWithdrawFrom.length, 'accounts to withdraw from 🤑');
  }

  // Harvest withheld fees from Token Accounts to Mint Account
  // This can be called by anyone
  await harvestWithheldTokensToMint(
      connection,
      payer, // Transaction fee payer
      mint, // Mint Account address
      accountsToWithdrawFrom, // Source Token Accounts for fee harvesting
      { commitment: "confirmed"}, // Confirmation options
      TOKEN_2022_PROGRAM_ID, // Token Extension Program ID
  );
  
  // Get amount of tokens to be transfered from Mint
  const withheldFeesMint = await getMintWithledTransferFees(connection, mint);

  // Call FeeMaanger Withdraw
  const withdrawFeesSignature = await program.methods
      .withdraw(new anchor.BN(withheldFeesMint.toString()))
      .accounts({
        mint,
        authority: withdrawAuthorityKeypair.publicKey,
        creator,
        dao,
      })
      .signers([withdrawAuthorityKeypair]) //Authority signer
      .rpc();
  await confirmTransaction(connection, withdrawFeesSignature);

  return withdrawFeesSignature;

}