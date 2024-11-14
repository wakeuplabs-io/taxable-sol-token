# taxable-sol-token

## Pre-requisits

- Install node 18 or above
- Install yarn globally

    ```bash
    npm i yarn -g
    ```

- Install Solana, Rust and Anchor following <https://solana.com/docs/intro/installation>
    ATENTION USE ANCHOR 0.30.1 AND SOLANA 1.18.26 OTHERWISE IT WON'T WORK

    ```bash
    sh -c "$(curl -sSfL https://release.anza.xyz/v1.18.17/install)"
    ```

    IF YOU ARE USING A MAC M1 solana-test-validator WON't WORK
    In order to run it you will have to built it manually following this steps:

  - Fetch
    Download the source code

    ```bash
    git clone https://github.com/solana-labs/solana.git
    ```

    Install protobuf

    ```bash
    brew install protobuf
    ```

  - Build

    ```bash
    cd solana/validator
    ```

    in solana/validator

    ```bash
    echo '#!/usr/bin/env bash
    here="$(dirname "$0")"
    set -x
    exec cargo build --release --manifest-path="$here"/Cargo.toml --bin solana-test-validator -- "$@"' > solana-test-validator
    ./solana-test-validator
    ```

- Test

    ```bash
    cd ../target/release
    ```

    in solana/target/release

    ```bash
    ./solana-test-validator
    ```

- Link

    Since I was using this with the original installed solana tools, I added the path to my shell config (~/.zshrc or ~/.bash_profile on mac). Just make sure that you are able to find the binary or the symlink to it after typing $which solana-test-validator What I added to my .zshrc:

    ```bash
    export PATH="/Users/lain/git/solana/solana-src/target/release:$PATH"
    ```

    of course, replace the user.

## Configuration

You can set custom configuration using environmental variables or creating a `.env` file following `.env.example`
If variables are not declare default values can be found in src/config.ts

Cluster indicates the network where the program is going to run, it can be devnet, testnet or mainnet-beta.

## Build

After setting up desired token configuration like name, symbol, uri, tax fee, etc into .env we will run:

```bash
anchor build
```

This will create the `target` folder taht will contain the keypair of the created programs as well as the `idl` and `.so` builded program

## Tests

### Config

Set solana to use localhost

```bash
solana config set --url localhost

```

Go to `Anchor.toml` and modify the cluster to use localnet

```toml
[provider]
cluster = "localnet"
```

### Run

Run the unit tests

```bash
anchor test
```

If you trying to running the tests and nothing happens, try running this command:

```bash
solana-test-validator

```

If you are running on a Mac M1, remember that you'll need to re build solana-test-validator, see [Pre-requisits](#pre-requisits)

## Deploy

### Config the network

Before deploying, we need to configure the network that we are going to deploy to.

```bash
solana config set --url devnet

```

Go to `Anchor.toml` and modify the cluster for the desired network to deploy

```toml
[provider]
cluster = "devnet"
```

It can be  localnet, devnet, testnet or mainnet.

### Run deployment

First we will deploy the `fee-manager` contract that will be used as the Authority for Tax Fee Config and Withdraw Withhelded Tokens

```bash
anchor deploy
```

When the deploy is done, it will create a `target` folder that contains the compiled program, idl and types.
Be aware that `target` folder is regenerated every time we run the deploy, and it gets deleted if we run anchor clean, so we recommend backing it up when deploying the final version.

After the fee-manager we are going to deploy and config our spl token into Solana using anchor mirate, the transaction will be printed together with the explorer url on the console

```bash
anchor migrate
```

A new variable will appear on the .env file called `MINT_KEY` this is the private key of the generated SPL TOKEN.

If you want to re run the migration you need to delete `MINT_KEY`

### Copy IDL

IDL will be used in the scripts or front end to interact with the program, that's why we copy it from the target folder that is not pushed ni the repo into the app/src/idl folder

To do this run

```bash
yarn copy-idl
```

### Deploy IDL

This is an optional step but it's good to know that you can publish your IDL file on the blockchain. This allows for other tools in the Solana ecosystem to recognise your program and understand what it has to offer.

To publish your IDL file, all you need to do is run the following in the terminal.

```bash
anchor idl init <programId> -f <target/idl/fee_manager.json>
```

And if your program changes in the future, you can upgrade the published IDL by running:

```bash
anchor idl upgrade <programId> -f <target/idl/fee_manager.json>
```

### Publishing

The Anchor Program Registry at apr.dev hosts a catalog of verified programs on Solana both written with and without Anchor. It is recommended that authors of smart contracts publish their source to promote best practices for security and transparency.

To publish the code to the Anchor Program Registry.

```bash
yarn publish:code
```

This can only be done on `mainnet`

## Scripts

We have added some scripts to interact with the token and program via typescript.

It will create a destination account and will transfer tokens to it, as it checks that source amount, destination amount and fees amount correspond to expected values.

### Get information about a token

```bash
yarn token-info
```

### Transfer from Suuply holder to a destination account

```bash
yarn transfer
```

### Harvest and withdraw fees to the DAO and Creator

```bash
yarn withdraw
```

### Set Fees

```bash
yarn set-fee
```

### Set DAO and Creator to withdraw fees

```bash
yarn set-destination
```
