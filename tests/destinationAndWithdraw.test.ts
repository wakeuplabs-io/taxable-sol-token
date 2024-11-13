import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FeeManager } from "../target/types/fee_manager";
import { assert } from "chai";
import { ExtensionType, TOKEN_2022_PROGRAM_ID, createInitializeMintInstruction, createInitializeTransferFeeConfigInstruction, getMintLen, createSetTransferFeeInstruction, getTransferFeeConfig, getMint, getAssociatedTokenAddress, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotent } from "@solana/spl-token";
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { getTokenAccountBalance } from "../app/helpers";
import { confirmTransaction } from "@solana-developers/helpers";

describe("Destination & Withdraw", () => {
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
  // Authority that can modify transfer fees
  const transferFeeConfigAuthority = payer;

  // Authority for the fee-manager program
  const authority = Keypair.generate();
  // creatorAndDao PDA
  const [creatorAndDao] = PublicKey.findProgramAddressSync(
    [Buffer.from("creator_and_dao"), authority.publicKey.toBuffer(), mint.toBuffer()],
    program.programId,
  );
  // Authority that can move tokens withheld on mint or token accounts
  const withdrawWithheldAuthority = creatorAndDao;
  

  // Generate new keypair for Creator and Dao Account
  const creatorKeypair = Keypair.generate();
  let creatorTokenAccount: PublicKey;
  const daoKeypair = Keypair.generate();
  let daoTokenAccount: PublicKey;


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
      transferFeeConfigAuthority.publicKey, // Authority to update fees
      withdrawWithheldAuthority, // Authority to withdraw fees
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

    // Create asociated token accounts
    creatorTokenAccount = await createAssociatedTokenAccountIdempotent(
      connection,
      payer,
      mint,
      creatorKeypair.publicKey,
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID,
    );
    daoTokenAccount = await createAssociatedTokenAccountIdempotent(
      connection,
      payer,
      mint,
      daoKeypair.publicKey,
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID,
    );
  })

  it("initialize destination", async () => {
    // Act
    const tx = await program.methods
      .initialize()
      .accounts({
        mintAccount: mint,
        authority: authority.publicKey,
        payer: payer.publicKey,
        dao: daoKeypair.publicKey,
        creator: creatorKeypair.publicKey,
      })
      .signers([payer, authority]) //Authority signer
      .rpc();
      await confirmTransaction(connection, tx);

    const creatorAndDaoStruct = await program.account.creatorAndDao.fetch(creatorAndDao);

    // Assert
    assert.equal(creatorAndDaoStruct.creatorTokenAccount.toBase58(), creatorTokenAccount.toBase58());
    assert.equal(creatorAndDaoStruct.daoTokenAccount.toBase58(), daoTokenAccount.toBase58());
  });

  it("Withdraw", async () => {
    //Arrenge
    // creatorAndDao needs to be initialized from initialize destination
    // if previous test fails this will fail too

    console.log("Authority", authority.publicKey.toBase58())
    console.log("CreatorAndDao", creatorAndDao.toBase58())
    console.log("mint", mint.toBase58())

    // Get Fee Vault
    const creatorAndDaoTokenAccount = getAssociatedTokenAddressSync(
      mint,
      creatorAndDao,
      true,
      TOKEN_2022_PROGRAM_ID,
    );
    console.log("creatorAndDaoTokenAccount", creatorAndDaoTokenAccount.toBase58())

    // Act
    const tx = await program.methods
      .withdraw()
      .accounts({
        mintAccount: mint,
        authority: authority.publicKey,
        payer: payer.publicKey,
        creator: creatorKeypair.publicKey,
        dao: daoKeypair.publicKey,
      })
      .signers([payer, authority]) //Authority signer
      .rpc();
    await confirmTransaction(connection, tx);

    const creatorTokenAmount = await getTokenAccountBalance(connection, creatorTokenAccount);
    const daoTokenAmount = await getTokenAccountBalance(connection, daoTokenAccount);

    // Assert
    assert.equal(creatorTokenAmount, BigInt(0));
    assert.equal(daoTokenAmount, BigInt(0));
  });
  
  it("setDestination", async () => {
    // 2 time Set Destination
    // Arrenge 
    // Generate new keypair for Creator and asociated token account
    const newCreatorKeypair = Keypair.generate();
    const newCreatorTokenAccount = await createAssociatedTokenAccountIdempotent(
      connection,
      payer,
      mintKeypair.publicKey,
      newCreatorKeypair.publicKey,
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID
    );
    // Generate new keypair for DAO and asociated token account
    const newDaoKeypair = Keypair.generate();
    const newDaoTokenAccount = await createAssociatedTokenAccountIdempotent(
      connection,
      payer,
      mintKeypair.publicKey,
      newDaoKeypair.publicKey,
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID
    );

    const tx = await program.methods
    .setDestination()
    .accounts({
      mintAccount: mint,
      authority: authority.publicKey,
      payer: payer.publicKey,
      newDao: newDaoKeypair.publicKey,
      newCreator: newCreatorKeypair.publicKey,
    })
    .signers([payer, authority]) //Authority signer
    .rpc();
    await confirmTransaction(connection, tx);
    
    const newCreatorAndDaoStruct = await program.account.creatorAndDao.fetch(creatorAndDao, "confirmed");
    console.log("newCreatorTokenAccount", newCreatorTokenAccount.toBase58(), "newDaoTokenAccount", newDaoTokenAccount.toBase58());
    // Assert
    assert.equal(newCreatorAndDaoStruct.creatorTokenAccount.toBase58(), newCreatorTokenAccount.toBase58());
    assert.equal(newCreatorAndDaoStruct.daoTokenAccount.toBase58(), newDaoTokenAccount.toBase58());
  });

});

