import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { FeeManager } from "../target/types/fee_manager";
import { assert } from "chai";
import { ExtensionType, TOKEN_2022_PROGRAM_ID, createInitializeMintInstruction, createInitializeTransferFeeConfigInstruction, getMintLen, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotent, mintTo, transferCheckedWithFee, createAccount, harvestWithheldTokensToMint, getTransferFeeAmount, getAccount } from "@solana/spl-token";
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction } from "@solana/web3.js";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { getTokenAccountBalance, getWithledTransferFees } from "../app/helpers";
import { confirmTransaction } from "@solana-developers/helpers";
import { getAccountsWithheldTokens } from "../app/withdrawFees";

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

  // Token Supply Holder to make transfers
  const supplyHolder = Keypair.generate();
  let supplyHolderTokenAccount: PublicKey;


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

    // Mint some tokes to use in test tranfers
    supplyHolderTokenAccount = await createAssociatedTokenAccountIdempotent(
      connection,
      payer,
      mint,
      supplyHolder.publicKey,
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID,
    );


    const amountToMint = BigInt(10 * 10 ** decimals);
    await mintTo(
      connection,
      payer,
      mint,
      supplyHolderTokenAccount,
      mintAuthority,
      amountToMint,
      [payer, mintAuthority],
      { commitment: "confirmed" },
      TOKEN_2022_PROGRAM_ID,
    );
  // End befofre
  });

  it("Should fail to withdraw whith if not initialized", async () => {
    // if previous test fails this will fail too
    const randomKeypair = Keypair.generate();
    // Act
    try {
      const tx = await program.methods
        .withdraw()
        .accounts({
          mintAccount: mint,
          authority: randomKeypair.publicKey,
          payer: payer.publicKey,
          creator: creatorKeypair.publicKey,
          dao: daoKeypair.publicKey,
        })
        .signers([payer, randomKeypair]) //Authority signer
        .rpc();
      await confirmTransaction(connection, tx);
      assert.fail("Withdraw was successful even though Invalid authority")
    } catch(err) {
      assert.equal(err.error.errorMessage, 'The program expected this account to be already initialized')
      assert.equal(err.error.origin, 'creator_and_dao')
    }
  });

  it("Should initialize destination", async () => {
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

  it("Should fail initialize if already initialized", async () => {
    // Act
    try {
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
      assert.fail("Should have failed to initialize")
    } catch(err) {
      assert.include(err.transactionMessage, 'Transaction simulation failed')
      assert.exists(err.transactionLogs.find((x: string)  => x.includes('already in use')))
    }
  });

  describe("When there are Fees", async () => {
    // if previous test fails this will fail too
    let mintTokenAccount: PublicKey;
    const destinationKeypair = new Keypair();
    let destinationTokenAccount: PublicKey;
    // Transfer amount
    const transferAmount = BigInt(1000_00);
    // Calculate transfer fee
    const fee = (transferAmount * BigInt(feeBasisPoints)) / BigInt(10_000);

    before(async () => {
      // Create Mint Token Account t
      mintTokenAccount = await createAssociatedTokenAccountIdempotent(
        connection,
        payer,
        mint,
        mint,
        { commitment: "confirmed" },
        TOKEN_2022_PROGRAM_ID,
      )
      // Create Token Account for destination
      destinationTokenAccount = await createAccount(
        connection,
        payer, // Payer to create Token Account
        mint, // Mint Account address
        destinationKeypair.publicKey, // Token Account owner
        undefined, // Optional keypair, default to Associated Token Account
        { commitment: "confirmed"}, // Confirmation options
        TOKEN_2022_PROGRAM_ID, // Token Extension Program ID
      );
      
      // Transfer tokens
      await transferCheckedWithFee(
        connection,
        payer, // Transaction fee payer
        supplyHolderTokenAccount, // Source Token Account
        mint, // Mint Account address
        destinationTokenAccount, // Destination Token Account
        supplyHolder.publicKey, // Owner of Source Account
        transferAmount, // Amount to transfer
        decimals, // Mint Account decimals
        fee, // Transfer fee
        [payer, supplyHolder], // Additional signers
        { commitment: "confirmed"}, // Confirmation options
        TOKEN_2022_PROGRAM_ID, // Token Extension Program ID
      );

    })

    it("Should harvest whithheld taxes to mint", async () => {
      /// Arrenge
      const initialMintTokenBalance = await getTokenAccountBalance(connection, mintTokenAccount);
      console.log("initialMintTokenBalance", initialMintTokenBalance)
      const initialWithheldFeesDestination = await getWithledTransferFees(connection, destinationTokenAccount);
      assert.equal(fee, initialWithheldFeesDestination);
      // Retrieve all Token Accounts for the Mint Account
      const accountsToWithdrawFrom = await getAccountsWithheldTokens(connection, mint);
      /// Act
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
      /// Assert
      const finalMintTokenBalance = await getTokenAccountBalance(connection, mintTokenAccount);
      console.log("finalMintTokenBalance", finalMintTokenBalance)
      const withheldFeesMintToken = await getWithledTransferFees(connection, mintTokenAccount);
      console.log("withheldFees MintToken", withheldFeesMintToken)

      const withheldFees = getTransferFeeAmount(
        await getAccount(
            connection, 
            mintTokenAccount,
            "confirmed",
            TOKEN_2022_PROGRAM_ID
        ),
      );
      console.log("withheldFees", withheldFees)

      const withheldFeesDestination = await getWithledTransferFees(connection, destinationTokenAccount);
      console.log("withheldFees Destination", withheldFeesDestination)
      assert.equal(fee, withheldFeesMintToken);
 
    });

    it("Should withdraw whithheld taxes from mint", async () => {
      // if previous test fails this will fail too

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
      assert.equal(creatorTokenAmount, fee / BigInt(2));
      assert.equal(daoTokenAmount, fee / BigInt(2));
    });



    it("Should set new Creator and Dao token destination", async () => {
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
      // Assert
      assert.equal(newCreatorAndDaoStruct.creatorTokenAccount.toBase58(), newCreatorTokenAccount.toBase58());
      assert.equal(newCreatorAndDaoStruct.daoTokenAccount.toBase58(), newDaoTokenAccount.toBase58());
    });

    it("Should fail to withdraw whith incorrect Dao or Creator", async () => {
      // if previous test fails this will fail too
      // Act
      try {
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
        assert.fail("Withdraw was successful even though DAO and Creator are invalid");
      } catch(err) {
        assert.equal(err.error.errorMessage, 'A has one constraint was violated');
        assert.equal(err.error.origin, 'creator_and_dao');
      }
    });
    
  
  });

});
