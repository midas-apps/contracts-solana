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

- anchor-cli - 0.30.1
- solana-cli - 2.0.16
- node - 20
- yarn - 1.22.22

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

> **_NOTE:_** in case if you don't have program keypairs for the programs, please build the project, get the new program account addresses and using global search just replace everywhere current addresses with the newly created

## Programs

- [access-control](./programs/access-control) - program that is responsible for granting/revoking roles for a specific address
- [data-feed](./programs/data-feed)- program that wraps a underlying price feed and exposes utility function to fetch and validate the price from that underlying data feed
- [token-authority](./programs/token-authority) - program that holds different authorities for SPL-2022 token mint and utilizes access-control to make it possible to have multiple authorities
- [midas-vaults](./programs/midas-vaults) - program that is responsible for issuing/redeeming mTokens

## Program addresses

|Program Name|Address|
|-|-|
|**access-control**|`GQp4fJwxmLF7vL7uJ4jpS3uRz96qrb7MfoLKMnJoeE3Z`|
|**data-feed**|`7dTNTpTqbHCLxc1FtpCRAq5d4u1Y6WVqrAc1znVGQDxV`|
|**token-authority**|`6XqSwGFEuadyqXC9vBLYGJhvQsEVjPdCrtvN6inAb4z3`|
|**midas-vaults**|`6eFgYZCZZFTe61T4YxWsiHHAunCLTh9V7TAjj8DxuZwm`|

## Account addresses

All account addresses can be found in [this file](./common/addresses.ts)
