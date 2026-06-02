# Deployment Scripts

Deployment and management system for Midas Solana smart contracts.

## Prerequisites

```bash
anchor build
anchor deploy --provider.cluster <network>
```

## Deployment

### Network Infrastructure

Run once per network before deploying any tokens:

1. `yarn deploy:timelock --network <network>` - Deploy Timelock for upgrade authority
2. `yarn deploy:global-ac-role --network <network>` - Deploy Global AC Role
3. `yarn deploy:global-ac --network <network>` - Deploy Global AC

### Token Deployment

If you need separated greenlist for a token, first deploy ac global overrides:

1. `yarn deploy:token-ac-role:global-override --mtoken <token> --network <network>`
2. `yarn deploy:token-ac:global-override --mtoken <token> --network <network>`

Run in order for each token:

1. `yarn deploy:token-ac-role --mtoken <token> --network <network>`
2. `yarn deploy:token-mint --mtoken <token> --network <network>`
3. `yarn deploy:token-authority --mtoken <token> --network <network>`
4. `yarn deploy:token-datafeed --mtoken <token> --network <network>`
5. `yarn deploy:minter-vault --mtoken <token> --network <network>`
6. `yarn deploy:redeemer-vault --mtoken <token> --network <network>`

### Post-Deployment Order

After the core deployment, grant access-control roles before running management actions such as adding payment tokens, updating vault pause state, or updating feeds.

1. `yarn token-ac:grant-admin --mtoken <token> --network <network>`
2. `yarn token-ac:revoke-deployer --mtoken <token> --network <network>`
3. `yarn token-ac:grant-operational --mtoken <token> --network <network>`
4. `yarn transfer:authority --mtoken <token> --network <network>`
5. Run token management tasks, for example `add:payment-token` and `update:vault-pause`.

Wait for any pending Fordefi approval to settle before continuing to a dependent step. Vault management tasks require the signer to already hold the relevant role: `vault_admin_role` for payment-token updates and `vault_pauser_role` for pause updates.

### Payment Token Deployment

- `yarn deploy:payment-token-feed --network <network> --payment-token <token>`
- `yarn deploy:mock-payment-token --network <network> --payment-token <token>` (localnet only)

## Configuration

### Token Configuration

Token configs in `configs/tokens/`:

```typescript
export const mTBILLConfig: TokenConfigWithNetworks = {
  metadata: { name: '...', symbol: 'mTBILL', decimals: 9 },
  tokenAuthority: { seed: 'mtbill-token-authority' },
  networks: {
    devnet: {
      dataFeed: { mode: 'switchboard', minPrice: '0.1', maxPrice: '100000', ... },
      minter: { instantFee: '1', instantDailyLimit: '10000', ... },
      redeemer: { instantFee: '1', instantDailyLimit: '10000', ... },
    },
  },
};
```

### Payment Token Configuration

Payment token configs in `configs/tokens/payment-tokens.ts`.

### Network Roles

Network admin addresses in `configs/network-roles.ts`.

### Address Storage

Deployed addresses saved to `common/addresses.ts`.

## Management

### Role Management

- `yarn token-ac:grant-role --mtoken <token> --network <network> --role <role>`
- `yarn token-ac:grant-admin --mtoken <token> --network <network>`
- `yarn token-ac:revoke-deployer --mtoken <token> --network <network>`
- `yarn token-ac:grant-operational --mtoken <token> --network <network>`

Roles: `admin`, `update_account_ac`, `vault_admin`, `vault_pauser`, `m_minter`, `m_burner`, `m_freezer`, `feed_admin`

### Token Management

- `yarn add:payment-token --mtoken <token> --network <network> --payment-token <payment>`
- `yarn delegate --mtoken <token> --network <network>`
- `yarn update:vault-pause --mtoken <token> --network <network> --vault <minter|redeemer> --action <action> --paused <true|false>`
- `yarn update:vault-pause --mtoken <token> --network <network> --paused <true|false>` - Apply configured `postDeploy.pauseFunctions`
- `yarn transfer:authority --mtoken <token> --network <network>`
- `yarn transfer:token-metadata-authority --mtoken <token> --network <network> --new-authority <pubkey>`

### Feed Management

- `yarn update:data-feed --mtoken <token> --network <network> --new-mode <mode>`
- `yarn update:token-metadata --mtoken <token> --network <network> --symbol <symbol> [--name <name>] [--uri <uri>]`
- `yarn update:manual-feed-price --mtoken <token> --network <network> --price <price>`

## Verification

- `yarn verify:token-metadata --mtoken <token> --network <network>`
- `yarn tsx scripts/tasks/verify/verify-roles.ts --mtoken <token> --network <network> [--address <pubkey>]`
- `yarn tsx scripts/verify/verify-no-roles.ts --network <network> --address <pubkey>`
- `yarn tsx scripts/tasks/verify/verify-mtoken-state.ts --mtoken <token> --network <network>`
- `yarn tsx scripts/tasks/verify/verify-feed.ts --mtoken <token> --network <network>`
- `yarn tsx scripts/tasks/verify/verify-payment-tokens.ts --mtoken <token> --network <network>`
- `yarn tsx scripts/tasks/verify/verify-redeem-request.ts --mtoken <token> --network <network> --request-id <id>`

**Direct verification utilities** (run with `yarn tsx scripts/tasks/verify/<script>.ts`):

- `verify-feed.ts` - Verify data feed configuration
- `verify-mtoken-state.ts` - Verify mToken state
- `verify-payment-tokens.ts` - Verify payment token setup
- `verify-redeem-request.ts` - Verify redeem request state
- `get-all-requests.ts` - List all pending requests
- `mint-payment-token.ts` - Mint test payment tokens

## User Operations

### Mint

```bash
tsx scripts/mint-instant.ts --mtoken <token> --network <network> --payment-token <payment> --amount <amount>
tsx scripts/mint-request.ts --mtoken <token> --network <network> --payment-token <payment> --amount <amount>
```

### Redeem

```bash
tsx scripts/redeem-instant.ts --mtoken <token> --network <network> --payment-token <payment> --amount <amount>
tsx scripts/redeem-request.ts --mtoken <token> --network <network> --payment-token <payment> --amount <amount>
tsx scripts/redeem-request-fiat.ts --mtoken <token> --network <network> --amount <amount>
```

### Approve Redeem Request

```bash
tsx scripts/approve-redeem-request.ts --mtoken <token> --network <network> --request-id <id>
```

## Local Development

```bash
solana-test-validator
anchor deploy --provider.cluster localnet
solana airdrop 10 --url http://127.0.0.1:8899
```

## Reference

### Common Arguments

- `--mtoken, -m` - Token symbol (required)
- `--network, -n` - Network (default: devnet)
- `--payment-token, -p` - Payment token symbol
- `--amount, -a` - Amount
- `--role, -r` - Role name
- `--address` - Target address (default: current wallet)

### Networks

`localnet`, `devnet`, `testnet`, `mainnet`

### Data Feed Modes

`switchboard`, `pyth`, `chainlink`, `manual`

### Files

- `configs/tokens/` - Token configurations
- `configs/tokens/payment-tokens.ts` - Payment token configurations
- `configs/network-roles.ts` - Network admin addresses
- `common/addresses.ts` - Deployed contract addresses
