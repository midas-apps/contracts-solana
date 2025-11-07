# Midas Vaults program

Implementation of EVM`s version of `DepositVault` and `RedemptionVault`

## Structure of program

### Instructions folder

- `minter_vault` - contains instructions related to minter vault
- `pause` - vault pause-related instructions
- `redeemer_vault` - contains instructions related to redeemer vault
- `vault_common` - instructions shared between minter and redeemer vaults

### Utils

Contains common helpers functions and types that are used in different instructions as well as some instruction implementations
