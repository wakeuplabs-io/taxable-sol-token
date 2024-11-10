import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Splitter } from "../target/types/splitter";
import { assert } from "chai";
import { createMint, createAssociatedTokenAccount, mintTo, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Keypair, sendAndConfirmTransaction } from "@solana/web3.js";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";

describe.skip("splitter", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Splitter as Program<Splitter>;
  const payer = (provider.wallet as NodeWallet).payer; //payer

  it("transferSplTokens", async () => {
    // Generate keypairs for the new accounts
    const fromKp = payer;
    const toKp = Keypair.generate();

    // Create a new mint and initialize it
    const mint = await createMint(
      program.provider.connection,
      payer,
      fromKp.publicKey,
      null,
      0
    );

    // Create associated token accounts for the new accounts
    const fromAta = await createAssociatedTokenAccount(
      program.provider.connection,
      payer,
      mint,
      fromKp.publicKey
    );
    const toAta = await createAssociatedTokenAccount(
      program.provider.connection,
      payer,
      mint,
      toKp.publicKey
    );

    // Mint tokens to the 'from' associated token account
    const mintAmount = 1000;
    await mintTo(
      program.provider.connection,
      payer,
      mint,
      fromAta,
      payer.publicKey,
      mintAmount
    );

    // init contract
    const txInit = await program.methods
    .initialize()
    .accounts({
      creator: fromAta,
      dao: toAta,
    })
    .signers([payer, fromKp])
    .transaction();

    const hash = await sendAndConfirmTransaction(program.provider.connection, txInit, [payer, fromKp]);
    console.log(`https://explorer.solana.com/tx/${hash}?cluster=devnet`);


    // Send transaction
    const transferAmount = new anchor.BN(500);
    const tx = await program.methods
      .transferSplTokens(transferAmount)
      .accounts({
        from: fromKp.publicKey,
        fromAta: fromAta,
        toAta: toAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([payer, fromKp])
      .transaction();
    const txHash = await sendAndConfirmTransaction(program.provider.connection, tx, [payer, fromKp]);
    console.log(`https://explorer.solana.com/tx/${txHash}?cluster=devnet`);
    const toTokenAccount = await provider.connection.getTokenAccountBalance(toAta);
    assert.strictEqual(
      toTokenAccount.value.uiAmount,
      transferAmount.toNumber(),
      "The 'to' token account should have the transferred tokens"
    );
  });
});
