# Deployment Scripts

Deployment system for Solana smart contracts.

## Quick Start

````bash
# Build and deploy programs
anchor build
anchor deploy --provider.cluster localnet

## Deployment Commands

### `deploy:network`

Deploys network infrastructure (AC Role Global + AC).

```bash
yarn deploy:network --network devnet
```

#### `deploy:token-ac-role`

Deploys token AC Role.

```bash
yarn deploy:token-ac-role --mtoken mTBILL --network devnet
```

#### `deploy:token-mint`

Deploys mToken mint. Requires AC Role.

```bash
yarn deploy:token-mint --mtoken mTBILL --network devnet
```

#### `deploy:token-authority`

Deploys Token Authority. Requires AC Role and mToken.

```bash
yarn deploy:token-authority --mtoken mTBILL --network devnet
```

### `deploy:token-datafeed`

Deploys data feed (Switchboard/Chainlink/Pyth/Manual). Requires AC Role.

```bash
yarn deploy:token-datafeed --mtoken mTBILL --network devnet
```

#### `deploy:minter-vault`

Deploys Minter Vault. Requires AC, AC Role, mToken, mTokenDataFeed, and Token Authority.

```bash
yarn deploy:minter-vault --mtoken mTBILL --network devnet
```

#### `deploy:redeemer-vault`

Deploys Redeemer Vault. Requires AC, AC Role, mToken, and mTokenDataFeed.

```bash
yarn deploy:redeemer-vault --mtoken mTBILL --network devnet
```

## Configuration

Token configs in `configs/tokens/` define deployment parameters. Shared values (metadata, tokenAuthority) at root, network-specific values (dataFeed, minter, redeemer) per network.

```typescript
export const mTBILLConfig: TokenConfigWithNetworks = {
  metadata: { name: '...', symbol: 'mTBILL', decimals: 9 },
  tokenAuthority: { seed: 'mtbill-token-authority' },
  networks: {
    devnet: {
      dataFeed: { mode: 'switchboard', ... },
      minter: { instantFee: '1', ... },
      redeemer: { instantFee: '1', ... },
    },
  },
};
```

Addresses are automatically saved to `common/addresses.ts` after deployment.

## Management Commands

### Add Payment Token

```bash
yarn add:payment-token --mtoken mTBILL --network devnet --payment-token USDC
```

### Grant Role

```bash
yarn grant:role --mtoken mTBILL --network devnet --role vault_admin_role
```

### Update Data Feed

```bash
yarn update:data-feed --mtoken mTBILL --network devnet --new-mode manual
```

## User Operations

### Mint

```bash
tsx scripts/mint-instant.ts --mtoken mTBILL --network devnet --payment-token USDC --amount 100
tsx scripts/mint-request.ts --mtoken mTBILL --network devnet --payment-token USDC --amount 100
```

### Redeem

```bash
tsx scripts/redeem-instant.ts --mtoken mTBILL --network devnet --payment-token USDC --amount 10
tsx scripts/redeem-request.ts --mtoken mTBILL --network devnet --payment-token USDC --amount 10
tsx scripts/redeem-request-fiat.ts --mtoken mTBILL --network devnet --amount 10
```

## Common Arguments

- `--mtoken, -m`: Token symbol (required)
- `--network, -n`: Network (localnet, devnet, testnet, mainnet, default: devnet)
- `--payment-token, -p`: Payment token symbol
- `--amount, -a`: Amount
- `--role, -r`: Role name

## Local Development

```bash
# Start local validator
solana-test-validator

# Deploy programs
anchor deploy --provider.cluster localnet

## Related Files

- `configs/tokens/` - Token configurations
- `common/addresses.ts` - Deployed addresses
- `package.json` - Script commands
```
````
