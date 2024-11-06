# taxable-sol-token

## Pre-requisits

- Install node 18 or above
- Install Solana <https://solana.com/docs/intro/installation>
    ATENTION USE ANCHOR 0.30.1 AND SOLANA 1.18.17 OTHERWISE IT WON'T WORK

    ```bash
    sh -c "$(curl -sSfL https://release.anza.xyz/v1.18.17/install)"
    ```

- run `npm i`

## Configuration

You can set custom configuration using environmental variables or creating a .env file following .env.example
If variables are not declare default values can be found in src/config.ts
If not found PRIVATE_KEY will be generated.
Cluster indicates the network where the program is going to run, it can be devnet, testnet or mainnet-beta. If devnet PRIVATE_KEY will receive an airdrop in order to run it, if it's another network make sure to set the private key and fund it before running the scripts.

## Steps

After setting up desired token configuration like name, symbol, uri, tax fee, etc into .env we will run:

```bash
npm start
```

This will deploy our token into Solana the transaction will be printed together with the explorer url on the consol
A new variable will appear on the .env file called MINT_KEY this is the private key of the generated SPL TOKEN keep it safe.

If you want to test if everything is working correctly you can use

```bash
npm test
```

It will create a destination account and will transfer tokens to it, as it checks that source amount, destination amount and fees amount correspond to expected values.
