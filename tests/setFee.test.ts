import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FeeManager } from "../target/types/fee_manager";
import { assert } from "chai";
import { ExtensionType, TOKEN_2022_PROGRAM_ID, createInitializeMintInstruction, createInitializeTransferFeeConfigInstruction, getMintLen, createSetTransferFeeInstruction, getTransferFeeConfig, getMint } from "@solana/spl-token";
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { confirmTransaction } from "@solana-developers/helpers";

describe("set_fee", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  const connection = new Connection(provider.connection.rpcEndpoint, "confirmed");
  anchor.setProvider(provider);

  const program = anchor.workspace.FeeManager as Program<FeeManager>;
  const payer = (provider.wallet as NodeWallet).payer; //payer

  // Generate new keypair for Mint Account
  const mintKeypair = Keypair.generate();
  // Address for Mint Account
  const mint = mintKeypair.publicKey;
  // Decimals for Mint Account
  const decimals = 8;
  // Authority that can mint new tokens
  const mintAuthority = payer;
  // Fee basis points for transfers (100 = 1%)
  const feeBasisPoints = 100;
  // Maximum fee for transfers in token base units
  const maxFee = BigInt(100000000);

  const [PDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("pda_authority"), payer.publicKey.toBuffer()],
    program.programId,
  );

  // Authority that can modify transfer fees
  const transferFeeConfigAuthority = PDA;
  // Authority that can move tokens withheld on mint or token accounts
  const withdrawWithheldAuthority = payer;

  before(async () => {
    // Size of Mint Account with extensions
    const mintLen = getMintLen([ExtensionType.TransferFeeConfig]);
    // Minimum lamports required for Mint Account
    const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

    // Instruction to invoke System Program to create new account
    const createAccountInstruction = SystemProgram.createAccount({
      fromPubkey: payer.publicKey, // Account that will transfer lamports to created account
      newAccountPubkey: mint, // Address of the account to create
      space: mintLen, // Amount of bytes to allocate to the created account
      lamports, // Amount of lamports transferred to created account
      programId: TOKEN_2022_PROGRAM_ID, // Program assigned as owner of created account
    });

    // Instruction to initialize TransferFeeConfig Extension
    const initializeTransferFeeConfig =
    createInitializeTransferFeeConfigInstruction(
      mint, // Mint Account address
      transferFeeConfigAuthority, // Authority to update fees
      withdrawWithheldAuthority.publicKey, // Authority to withdraw fees
      feeBasisPoints, // Basis points for transfer fee calculation
      maxFee, // Maximum fee per transfer
      TOKEN_2022_PROGRAM_ID, // Token Extension Program ID
    );

    // Instruction to initialize Mint Account data
    const initializeMintInstruction = createInitializeMintInstruction(
      mint, // Mint Account Address
      decimals, // Decimals of Mint
      mintAuthority.publicKey, // Designated Mint Authority
      null, // Optional Freeze Authority
      TOKEN_2022_PROGRAM_ID, // Token Extension Program ID
    );

    // Add instructions to new transaction
    const transaction = new Transaction().add(
      createAccountInstruction,
      initializeTransferFeeConfig,
      initializeMintInstruction,
    );
    
    // Send transaction
    await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer, mintKeypair], // Signers
    );

    console.log("Create Mint Account:", mint.toBase58());
  })

  it("setTransferFee", async () => {
    // Arrenge
    const oldTokenMintData = await getMint(
      connection, 
      mint, 
      "confirmed", 
      TOKEN_2022_PROGRAM_ID
    )
    const oldFee = getTransferFeeConfig(oldTokenMintData);
    assert.equal(oldFee.olderTransferFee.transferFeeBasisPoints, feeBasisPoints);
    assert.equal(oldFee.newerTransferFee.transferFeeBasisPoints, feeBasisPoints);

    const newFeeBasisPoints = 200
    // /// This is how it's manually updated
    //    const transferFeeConfigAuthority = payer;
    // const setTransferFeeInstruction = createSetTransferFeeInstruction(
    //   mint,
    //   transferFeeConfigAuthority.publicKey,
    //   [transferFeeConfigAuthority],
    //   newFeeBasisPoints,
    //   maxFee,
    //   TOKEN_2022_PROGRAM_ID
    // )
    // /// Add instructions to new transaction
    // const newTransaction = new Transaction().add(
    //   setTransferFeeInstruction
    // );

    // /// Send transaction
    // const newTransactionSignature = await sendAndConfirmTransaction(
    //   connection,
    //   newTransaction,
    //   [payer], // Signers
    // );
    // console.log(
    //   "\Update  Fee Config:",
    //   `https://solana.fm/tx/${newTransactionSignature}?cluster=devnet-solana`,
    // );
  
    /// Change fees through the contract

    // Act
    const tx = await program.methods
      .setFee(newFeeBasisPoints)
      .accounts({
        mint, 
        authority: payer.publicKey,
      })
      .signers([payer]) //Authority signer
      .rpc();
    await confirmTransaction(program.provider.connection, tx);


    const newTokenMintData = await getMint(
      connection, 
      mint, 
      "confirmed", 
      TOKEN_2022_PROGRAM_ID
    )
    const newFee = getTransferFeeConfig(newTokenMintData);

    // Assert
    assert.equal(newFee.olderTransferFee.transferFeeBasisPoints, feeBasisPoints);
    assert.equal(newFee.newerTransferFee.transferFeeBasisPoints, newFeeBasisPoints);

  });
});
