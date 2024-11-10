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

You can set custom configuration using environmental variables or creating a .env file following .env.example
If variables are not declare default values can be found in src/config.ts
If not found PRIVATE_KEY will be generated.
Cluster indicates the network where the program is going to run, it can be devnet, testnet or mainnet-beta. If devnet PRIVATE_KEY will receive an airdrop in order to run it, if it's another network make sure to set the private key and fund it before running the scripts.

## Steps

After setting up desired token configuration like name, symbol, uri, tax fee, etc into .env we will run:

```bash
anchor build
```

This will deploy our token into Solana the transaction will be printed together with the explorer url on the consol
A new variable will appear on the .env file called MINT_KEY this is the private key of the generated SPL TOKEN keep it safe.

If you want to test if everything is working correctly you can use

```bash
anchor test
```

It will create a destination account and will transfer tokens to it, as it checks that source amount, destination amount and fees amount correspond to expected values.
