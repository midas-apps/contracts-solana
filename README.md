This repository is licensed under the Business Source License 1.1.
The license applies to the entire codebase, including all prior revisions.

# Midas Solana programs repository

This repository contains all Solana programs related to the [midas.app](https://midas.app) project.

Midas Solana programs trying to mimic everything that was previously developed for EVM-based chains, but some features currently were not implemented due to either blockchain limitations or missing on-chain data.

Features that are currently not implemented in Solana programs:

- Sanctions list
- Swapper redeemer
- BUIDL redeemer

## Application requirements

All requirements and invariants for the programs are described in [this notion document](https://ludicrous-rate-748.notion.site/14259c617f19807398bef97ec6ebf392?v=14259c617f1981ba9b3c000c58daf515&pvs=73)

## The structure of the repository

- [programs/](./programs/) - root folder for programs source code.
- [common/](./common/) - shared typescript constants/utilities.
- [scripts/](./scripts/) - anchor scripts. Currently contains deploy/upgrade scripts as well as some 'playground' scripts.
- [test/](./test/) - programs tests.

## Prerequirments

- anchor-cli - 0.32.1
- solana-cli - 2.2.20
- rustc - 1.93.1
- node - ^24
- yarn - 4.10.3

## Installation Guide

Follow these steps to set up your environment:

1. **Install Rust**

   Install Rust using [rustup.rs](https://rustup.rs/).

2. **Install Solana CLI (v2.2.20) via agave-install**

   Use the [official installation guide](https://docs.anza.xyz/cli/install):

   ```sh
   sh -c "$(curl -sSfL https://release.anza.xyz/v2.2.20/install)"
   ```

3. **Install Anchor Version Manager (AVM) and Anchor CLI (v0.32.1)**

   ```sh
   cargo install --git https://github.com/coral-xyz/anchor --tag v0.32.1 avm --locked --force
   ```

   Then run:

   ```sh
   avm install 0.32.1
   avm use 0.32.1
   ```

   Verify your installation:

   ```sh
   anchor --version
   # should output: anchor-cli 0.32.1
   ```

4. **(Optional) Install build tools**

If you encounter build errors related, you should probably install sbf tools:

```sh
cargo build-sbf --force-tools-install
```

## How to build the project

```
yarn build
```

## How to run tests

To run all tests:

```
yarn test
```

To run only cargo tests:

```
yarn test:cargo
```

To run only anchor tests:

```
yarn test:anchor
```

## How to view documentation

Generate rust docs:

```
yarn codegen
```

Open HTML file in browser:

```
target/doc/<program_name>/index.html
```

> **_NOTE:_** in case if you don't have program keypairs for the programs, please build the project, get the new program account addresses and using global search just replace everywhere current addresses with the newly created

## Programs

- [access-control](./programs/access-control/README.md) - program that is responsible for granting/revoking roles for a specific address
- [data-feed](./programs/data-feed)- program that wraps a underlying price feed and exposes utility function to fetch and validate the price from that underlying data feed
- [token-authority](./programs/token-authority) - program that holds different authorities for SPL-2022 token mint and utilizes access-control to make it possible to have multiple authorities
- [midas-vaults](./programs/midas-vault/README.md) - program that is responsible for issuing/redeeming mTokens

## Program addresses

| Program Name        | Address                                       |
| ------------------- | --------------------------------------------- |
| **access-control**  | `MAC1H4FiknRdqG7DdEmQXgdp688w8Zo5t44T3CsKt3P` |
| **data-feed**       | `MDF1kkcgJqyizY8k3U1ESAxLBYFYmE3qTwxf2pmGE1s` |
| **token-authority** | `MTA14NBri1ojys9tnxYuRKHTtVNAssT9bHo5Lt21vDa` |
| **midas-vaults**    | `MidasZepq8k2oFNCCm1rm31rbbj68JSPJeXwqQu6NfZ` |

## Account addresses

All account addresses can be found in [this file](./common/addresses.ts)
