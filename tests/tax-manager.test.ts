import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TaxManager } from "../target/types/tax_manager";
import { assert } from "chai";
import { ExtensionType, TOKEN_2022_PROGRAM_ID, createInitializeMintInstruction, createInitializeTransferFeeConfigInstruction, getMintLen, createSetTransferFeeInstruction, getTransferFeeConfig, getMint } from "@solana/spl-token";
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";

describe("tax-manager", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  const connection = new Connection(provider.connection.rpcEndpoint, "confirmed");
  anchor.setProvider(provider);

  const program = anchor.workspace.TaxManager as Program<TaxManager>;
  const payer = (provider.wallet as NodeWallet).payer; //payer

  it("setTransferFee", async () => {
    // Generate new keypair for Mint Account
    const mintKeypair = Keypair.generate();
    // Address for Mint Account
    const mint = mintKeypair.publicKey;
    // Decimals for Mint Account
    const decimals = 2;
    // Authority that can mint new tokens
    const mintAuthority = payer;


    const [PDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("fee_authority"), payer.publicKey.toBuffer()],
      program.programId,
    );

    // Authority that can modify transfer fees
    const transferFeeConfigAuthority = PDA;
    // Authority that can move tokens withheld on mint or token accounts
    const withdrawWithheldAuthority = payer;
    
    // Fee basis points for transfers (100 = 1%)
    const feeBasisPoints = 100;
    // Maximum fee for transfers in token base units
    const maxFee = BigInt(100000000);

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
    const transactionSignature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [payer, mintKeypair], // Signers
    );

    console.log(
      "\nCreate Mint Account:",
      `https://solana.fm/tx/${transactionSignature}?cluster=devnet-solana`,
    );

    const oldTokenMintData = await getMint(
      connection, 
      mint, 
      "confirmed", 
      TOKEN_2022_PROGRAM_ID
    )
    const oldFee = getTransferFeeConfig(oldTokenMintData);
    console.log("Old fee", oldFee)

    const newFeeBasisPoints = 200
    // This is how it's manually updated
    // const setTransferFeeInstruction = createSetTransferFeeInstruction(
    //   mint,
    //   transferFeeConfigAuthority.publicKey,
    //   [transferFeeConfigAuthority],
    //   newFeeBasisPoints,
    //   maxFee,
    //   TOKEN_2022_PROGRAM_ID
    // )
    // // Add instructions to new transaction
    // const newTransaction = new Transaction().add(
    //   setTransferFeeInstruction
    // );

    // // Send transaction
    // const newTransactionSignature = await sendAndConfirmTransaction(
    //   connection,
    //   newTransaction,
    //   [payer], // Signers
    // );
    // console.log(
    //   "\Update  Fee Config:",
    //   `https://solana.fm/tx/${newTransactionSignature}?cluster=devnet-solana`,
    // );
  

    // This is how it's updated by a smart contract
    // init contract
    // const txInit = await program.methods
    // .initialize()
    // .accounts({})
    // .signers([payer])
    // .transaction();

    // const hash = await sendAndConfirmTransaction(program.provider.connection, txInit, [payer]);
    // console.log(`https://explorer.solana.com/tx/${hash}?cluster=devnet`);

    // Change fees through the contract
    console.log(`PDA`, PDA.toBase58())
    console.log(`Program id`, program.programId.toBase58())
    console.log(`transferFeeConfigAuthority`, transferFeeConfigAuthority.toBase58())


    const tx = await program.methods
      .setTransferFee(newFeeBasisPoints)
      .accounts({
        mint, 
        authority: payer.publicKey,
        payer: payer.publicKey,
      })
      .signers([payer]) //Authority signer
      .transaction();
    const txHash = await sendAndConfirmTransaction(program.provider.connection, tx, [payer]);
    console.log(`https://explorer.solana.com/tx/${txHash}?cluster=devnet`);

    const newTokenMintData = await getMint(
      connection, 
      mint, 
      "confirmed", 
      TOKEN_2022_PROGRAM_ID
    )
    const newFee = getTransferFeeConfig(newTokenMintData);
    console.log("New fee", newFee)
    assert.equal(newFee.newerTransferFee.transferFeeBasisPoints, newFeeBasisPoints);

  });
});
