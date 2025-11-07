# Deployment Scripts Documentation

This directory contains a clean, configurable deployment system for Solana smart contracts.

## Architecture Overview

```
scripts/
├── configs/              # Configuration validation and loading
│   ├── types.ts         # Zod schemas for type-safe configs
│   ├── loadTokenConfig.ts
│   └── validateConfig.ts
├── deploy/              # Deployment orchestrators
│   └── orchestrators/
│       ├── deployNetworkInfrastructure.ts
│       ├── deployTokenCore.ts
│       ├── deployToken.ts (full deployment)
│       ├── deployDataFeed.ts
│       ├── deployMinterVault.ts
│       ├── deployRedeemerVault.ts
│       └── deployTokenAuthority.ts
├── tasks/               # CLI entry points
│   ├── deploy-all.ts
│   ├── deploy-network-infrastructure.ts
│   ├── deploy-token-core.ts
│   ├── deploy-token-datafeed.ts
│   ├── deploy-token-vaults.ts
│   └── add-payment-token.ts
└── utils/               # Utility functions
    ├── argumentParser.ts
    ├── deploymentState.ts
    ├── addressManager.ts
    ├── networkResolver.ts
    └── dependencyChecker.ts
```

## Deployment Flow

The deployment system follows a **two-level hierarchy**:

### Level 1: Network Infrastructure (once per network)

- **AC Role Global** - Shared role for the entire network
- **AC (Access Control)** - Global access control contract
- Deployed once per network, shared across all tokens

### Level 2: Token Components (per token)

- **Core Token** - AC Role, mToken, Token Authority
- **Data Feed** - Price feed for the token
- **Vaults** - Minter Vault and Redeemer Vault

## Quick Start

```bash
anchor deploy --provider.cluster localnet
```

### Deploy Everything (Recommended)

```bash
yarn deploy:all --mtoken mTBILL --network devnet
```

This single command:

1. ✅ Deploys network infrastructure (if needed)
2. ✅ Deploys core token (AC Role, mToken, Token Authority)
3. ✅ Deploys data feed
4. ✅ Deploys vaults (Minter + Redeemer)

### Incremental Deployment

If you prefer to deploy components separately:

```bash
# 1. Deploy network infrastructure (once per network)
yarn deploy:network --network devnet

# 2. Deploy core token
yarn deploy:token-core --mtoken mTBILL --network devnet

# 3. Deploy data feed
yarn deploy:token-datafeed --mtoken mTBILL --network devnet

# 4. Deploy vaults
yarn deploy:token-vaults --mtoken mTBILL --network devnet
```

## Deployment Commands

### `deploy:all` - Deploy Everything

Deploys network infrastructure + full token in one command.

```bash
yarn deploy:all --mtoken mTBILL --network devnet
```

**What it does:**

- Checks if network infrastructure exists, deploys if missing
- Deploys core token (AC Role, mToken, Token Authority)
- Deploys data feed
- Deploys vaults (Minter + Redeemer)

**Use when:** You want to deploy a complete token from scratch.

### `deploy:network` - Network Infrastructure

Deploys AC + AC Role Global (once per network).

```bash
yarn deploy:network --network devnet
```

**What it does:**

- Deploys AC Role Global
- Deploys AC (Access Control)
- Registers addresses in `common/addresses.ts`

**Use when:** Setting up a new network or ensuring infrastructure exists.

**Note:** This is automatically done by `deploy:all` if needed. You typically don't need to run this separately.

### `deploy:token-core` - Core Token Components

Deploys core token components: AC Role, mToken, and Token Authority.

```bash
yarn deploy:token-core --mtoken mTBILL --network devnet
```

**What it does:**

- Deploys token-specific AC Role
- Deploys mToken (SPL Token 2022 mint)
- Deploys Token Authority

**Use when:** You want to deploy core token components separately, then deploy feed/vaults later.

**Prerequisites:** Network infrastructure must exist.

### `deploy:token-datafeed` - Data Feed

Deploys the price data feed for the token.

```bash
yarn deploy:token-datafeed --mtoken mTBILL --network devnet
```

**What it does:**

- Deploys data feed (Switchboard/Chainlink/Pyth/Manual)
- Configures price bounds and staleness limits
- Creates a `FeedState` account that wraps the underlying feed

**Data Feed Deployment Details:**

The deployment process creates different accounts depending on the feed mode:

1. **Manual Feed** (`mode: 'manual'`):
   - Creates a `FeedState` account
   - Creates a `ManualFeedState` PDA account (derived from FeedState)
   - Grants `FEED_ADMIN` role to the payer
   - Sets initial price from `minPrice` config

2. **Switchboard Feed** (`mode: 'switchboard'`):
   - Creates a Switchboard `PullFeed` account (via Switchboard SDK)
   - Creates a `FeedState` account that wraps the Switchboard feed
   - Uses the Switchboard feed address as `underlyingFeed` in FeedState

3. **Pyth Feed** (`mode: 'pyth'`):
   - Requires an existing Pyth feed address in config (`underlyingFeed`)
   - Creates a `FeedState` account that references the Pyth feed
   - Validates that `underlyingFeed` is provided and not a placeholder

4. **Chainlink Feed** (`mode: 'chainlink'`):
   - Requires an existing Chainlink OCR2 feed address in config (`underlyingFeed`)
   - Creates a `FeedState` account that references the Chainlink feed
   - Validates that `underlyingFeed` is provided and not a placeholder

**Use when:** Deploying data feed separately or updating feed configuration.

**Prerequisites:** Network infrastructure + core token must exist.

### `deploy:token-vaults` - Vaults

Deploys Minter Vault and Redeemer Vault.

```bash
yarn deploy:token-vaults --mtoken mTBILL --network devnet
```

**What it does:**

- Deploys Minter Vault (for minting tokens)
- Deploys Redeemer Vault (for redeeming tokens)

**Use when:** Deploying vaults separately or after core token + feed are deployed.

**Prerequisites:** Network infrastructure + core token + data feed must exist.

## Deployment Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    deploy:all                               │
│              (One command for everything)                   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ├─────────────────┐
                          │                 │
                          ▼                 ▼
        ┌─────────────────────────┐  ┌──────────────────────┐
        │  Network Infrastructure │  │   Full Token        │
        │  (auto-deployed if      │  │                      │
        │   missing)              │  │  ┌────────────────┐ │
        │                         │  │  │ Core Token     │ │
        │  • AC Role Global       │  │  │ • AC Role      │ │
        │  • AC                   │  │  │ • mToken       │ │
        └─────────────────────────┘  │  │ • Token Auth   │ │
                                     │  └────────────────┘ │
                                     │  ┌────────────────┐ │
                                     │  │ Data Feed      │ │
                                     │  └────────────────┘ │
                                     │  ┌────────────────┐ │
                                     │  │ Vaults         │ │
                                     │  │ • Minter       │ │
                                     │  │ • Redeemer     │ │
                                     │  └────────────────┘ │
                                     └──────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              Incremental Deployment Flow                   │
└─────────────────────────────────────────────────────────────┘

Step 1: yarn deploy:network --network devnet
        └─> Deploys: AC Role Global + AC

Step 2: yarn deploy:token-core --mtoken mTBILL --network devnet
        └─> Deploys: AC Role + mToken + Token Authority

Step 3: yarn deploy:token-datafeed --mtoken mTBILL --network devnet
        └─> Deploys: Data Feed

Step 4: yarn deploy:token-vaults --mtoken mTBILL --network devnet
        └─> Deploys: Minter Vault + Redeemer Vault
```

## Dependency Verification

All scripts automatically verify dependencies before deployment:

- ✅ `deploy:all` → Checks network infrastructure (deploys if missing)
- ✅ `deploy:token-core` → Verifies network infrastructure exists
- ✅ `deploy:token-datafeed` → Verifies network infrastructure exists
- ✅ `deploy:token-vaults` → Verifies network infrastructure + core token + data feed exist

If dependencies are missing, you'll get a clear error message:

```
Network infrastructure not found for devnet. Missing: AC Role Global, AC
Please run: yarn deploy:network --network devnet
```

## Multiple Tokens on Same Network

To deploy multiple tokens on the same network:

```bash
# Deploy first token (includes network infrastructure)
yarn deploy:all --mtoken mTBILL --network devnet

# Deploy second token (reuses network infrastructure)
yarn deploy:all --mtoken mTREASURY --network devnet

# Deploy third token
yarn deploy:all --mtoken mBOND --network devnet
```

Each token gets its own:

- AC Role (token-specific)
- mToken
- Token Authority
- Data Feed
- Minter Vault
- Redeemer Vault

But they all share:

- AC Role Global (network-level)
- AC (network-level)

## Configuration System

### Token Configuration

Token configs live in [`configs/tokens/`](../configs/tokens/) and define deployment parameters for all networks. The configuration uses a **base + networks** structure where:

- **Shared values** (metadata, tokenAuthority) are defined at the root level
- **Network-specific values** (dataFeed, minter, redeemer, paymentTokens) are defined per network

```typescript
// configs/tokens/mTBILL.ts
import { TokenConfigWithNetworks } from '@/scripts/configs/types';

export const mTBILLConfig: TokenConfigWithNetworks = {
  // Shared configuration (same across all networks)
  metadata: {
    name: 'Midas US Treasury Bill Token',
    symbol: 'mTBILL',
    decimals: 9,
    uri: 'https://...',
  },
  tokenAuthority: {
    seed: 'mtbill-token-authority',
  },
  // Network-specific configurations
  networks: {
    devnet: {
      dataFeed: {
        mode: 'switchboard',
        minPrice: '0.1',
        maxPrice: '100000',
        maxStaleness: 86400,
        switchboard: {
          env: 'devnet',
          ethRpc: 'https://ethereum-sepolia-rpc.publicnode.com',
          ethDataFeed: '0x4E677F7FE252DE44682a913f609EA3eb6F29DC3E',
        },
      },
      minter: {
        instantFee: '1',
        instantDailyLimit: '10000',
        variationTolerance: '1',
        minAmount: '1',
        firstMintMinMTokens: '10',
        greenListEnforced: false,
      },
      redeemer: {
        instantFee: '1',
        instantDailyLimit: '10000',
        variationTolerance: '1',
        minAmount: '1',
        minFiatRedeemAmount: '10',
        fiatFlatFee: '1',
        greenListEnforced: false,
      },
      paymentTokens: [
        /* optional */
      ],
    },
    // Add more networks as needed
    // mainnet: { /* ... */ },
  },
};
```

**Key Benefits:**

- ✅ Single source of truth for all network configs
- ✅ Shared values defined once (no duplication)
- ✅ Easy to add new networks (just add a new key)
- ✅ Type-safe with Zod validation

### Address Management

Deployed addresses are stored in [`common/addresses.ts`](../common/addresses.ts):

```typescript
export const addresses: Record<string, NetworkAddresses> = {
  devnet: {
    acRoleGlobal: new PublicKey('...'),
    ac: new PublicKey('...'),
    tokens: {
      mTBILL: {
        acRole: new PublicKey('...'),
        mToken: new PublicKey('...'),
        tokenAuthority: { account: new PublicKey('...'), seed: '...' },
        mTokenDataFeed: new PublicKey('...'),
        minter: {
          commonVault: new PublicKey('...'),
          account: new PublicKey('...'),
        },
        redeemer: {
          commonVault: new PublicKey('...'),
          account: new PublicKey('...'),
        },
      },
    },
    feeds: {
      usdc: { feed: new PublicKey('...') },
    },
  },
};
```

**Important**: `addresses.ts` is the source of truth for deployed contracts. **Addresses are automatically saved and formatted** after each successful deployment.

**Localnet Support**: The `localnet` network is initialized with placeholder addresses. During deployment, addresses are registered in runtime memory via `registerAddress()` and automatically persisted to `addresses.ts`.

## Validation Strategy

The system uses a **two-phase validation approach**:

### Phase 1: Schema + Business Rules (Pre-deployment)

```typescript
loadTokenConfig(tokenSymbol, network);
// ✓ Validates structure and types (Zod schema)
// ✓ Validates business rules (fees, ranges, etc.)
// ✓ Merges base config with network-specific config
// ✗ Does NOT check if addresses exist
```

Safe to use during initial deployment when addresses don't exist yet.

### Phase 2: Cross-Reference Validation (Runtime)

```typescript
loadTokenConfigWithReferences(tokenSymbol, network);
// ✓ Validates payment token feeds exist in addresses.ts
// ✓ Checks required addresses are deployed
```

Use this when adding payment tokens or validating against existing deployments.

## Additional Commands

### Add Payment Token

```bash
yarn add:payment-token \
  --mtoken mTBILL \
  --network devnet \
  --payment-token USDC \
  --fee 0.1 \
  --allowance 1000000 \
  --stable true
```

**Prerequisites:**

- Token vaults must be deployed
- Payment token mint and feed must exist in `addresses.ts`

**Configuration:**

- Can use CLI args (shown above)
- Or define in token config `paymentTokens` array
- CLI args override config values

## Deployment State Management

> **Note**: The deployment state management infrastructure exists in `scripts/utils/deploymentState.ts` but is not currently integrated into the deployment scripts. The state files are created but not actively used by `deploy:all` or other deployment commands.

The infrastructure supports:

```typescript
// Deployment state stored in .deployment-state/
{
  "token": "mTBILL",
  "network": "devnet",
  "timestamp": 1234567890,
  "completed": ["acRole", "mToken"],
  "pending": ["tokenAuthority", "dataFeed", "minterVault", "redeemerVault"],
  "addresses": {
    "acRole": "...",
    "mToken": "..."
  },
  "errors": [],
  "transactions": []
}
```

Future enhancements may include:

- Resume failed deployments
- Skip already-deployed components
- Track deployment progress

## CLI Arguments Reference

### Common Arguments

All scripts support:

- `--mtoken, -m`: Token symbol (e.g., mTBILL)
- `--network, -n`: Network (localnet, devnet, testnet, mainnet)

### deploy:all

```bash
yarn deploy:all \
  --mtoken <SYMBOL> \
  --network <NETWORK>
```

Options:

- `--mtoken, -m`: Token symbol (required)
- `--network, -n`: Network (required, default: devnet)

### add:payment-token

```bash
yarn add:payment-token \
  --mtoken <SYMBOL> \
  --network <NETWORK> \
  --payment-token <SYMBOL> \
  [--fee <PERCENT>] \
  [--allowance <AMOUNT>] \
  [--stable] \
  [--is-fiat]
```

Options:

- `--fee`: Fee percentage (e.g., "0.1" for 0.1%)
- `--allowance`: Max allowance amount
- `--stable`: Use 1:1 rate (for stablecoins)
- `--is-fiat`: Fiat payment token flag

## Management Scripts

All management scripts now support CLI arguments for `--mtoken`, `--network`, and other script-specific options.

### Mint Scripts

#### mint-instant

Mint tokens instantly using a payment token.

```bash
tsx scripts/mint-instant.ts \
  --mtoken mTBILL \
  --network devnet \
  --payment-token USDC \
  --amount 100
```

**Arguments:**

- `--mtoken, -m`: Token symbol (required)
- `--network, -n`: Network (required, default: devnet)
- `--payment-token, -p`: Payment token symbol (required, e.g., USDC)
- `--amount, -a`: Amount to mint in payment token units (required, e.g., "100")

**Note:** Amount is parsed with 6 decimals (standard for USDC/USDT).

#### mint-request

Create a mint request (requires approval).

```bash
tsx scripts/mint-request.ts \
  --mtoken mTBILL \
  --network devnet \
  --payment-token USDC \
  --amount 100
```

**Arguments:** Same as `mint-instant`

### Redeem Scripts

#### redeem-instant

Redeem tokens instantly for a payment token.

```bash
tsx scripts/redeem-instant.ts \
  --mtoken mTBILL \
  --network devnet \
  --payment-token USDC \
  --amount 10
```

**Arguments:**

- `--mtoken, -m`: Token symbol (required)
- `--network, -n`: Network (required, default: devnet)
- `--payment-token, -p`: Payment token symbol (required)
- `--amount, -a`: Amount to redeem in mToken units (required, e.g., "10")

**Note:** Amount is parsed with 9 decimals (standard for mTokens).

#### redeem-request

Create a redeem request (requires approval).

```bash
tsx scripts/redeem-request.ts \
  --mtoken mTBILL \
  --network devnet \
  --payment-token USDC \
  --amount 10
```

**Arguments:** Same as `redeem-instant`

#### redeem-request-fiat

Create a fiat redeem request (no payment token required).

```bash
tsx scripts/redeem-request-fiat.ts \
  --mtoken mTBILL \
  --network devnet \
  --amount 10
```

**Arguments:**

- `--mtoken, -m`: Token symbol (required)
- `--network, -n`: Network (required, default: devnet)
- `--amount, -a`: Amount to redeem in mToken units (required)

### Management Scripts

#### grant-role

Grant an access control role to an account.

```bash
tsx scripts/grant-role.ts \
  --mtoken mTBILL \
  --network devnet \
  --role vault_admin_role
```

**Arguments:**

- `--mtoken, -m`: Token symbol (required)
- `--network, -n`: Network (required, default: devnet)
- `--role, -r`: Role to grant (required, e.g., `vault_admin_role`, `vault_pauser_role`, `admin_role`)

**Available Roles:**

- `vault_admin_role`: Vault administrator
- `vault_pauser_role`: Vault pauser
- `admin_role`: Access control admin
- `data_feed_admin`: Data feed administrator

#### transfer-authority

Transfer token authority (mint, freeze, etc.).

```bash
tsx scripts/transfer-authority.ts \
  --mtoken mTBILL \
  --network devnet \
  --authority-type FreezeAccount \
  [--current-authority <PUBKEY>] \
  [--new-authority <PUBKEY>]
```

**Arguments:**

- `--mtoken, -m`: Token symbol (required)
- `--network, -n`: Network (required, default: devnet)
- `--authority-type`: Authority type (required, one of: `MintTokens`, `FreezeAccount`, `AccountOwner`, `CloseAccount`)
- `--current-authority`: Current authority address (optional, defaults to payer)
- `--new-authority`: New authority address (optional, defaults to payer)

#### update-data-feed

Update data feed configuration.

```bash
tsx scripts/update-data-feed.ts \
  --mtoken mTBILL \
  --network devnet \
  [--new-underlying-feed <PUBKEY>] \
  [--new-mode manual|switchboard|pyth|chainlink]
```

**Arguments:**

- `--mtoken, -m`: Token symbol (required)
- `--network, -n`: Network (required, default: devnet)
- `--new-underlying-feed`: New underlying feed address (optional)
- `--new-mode`: New feed mode (optional, one of: `manual`, `switchboard`, `pyth`, `chainlink`)

#### delegate

Delegate payment token allowance to redeemer vault.

```bash
tsx scripts/delegate.ts \
  --mtoken mTBILL \
  --network devnet \
  --payment-token USDC
```

**Arguments:**

- `--mtoken, -m`: Token symbol (required)
- `--network, -n`: Network (required, default: devnet)
- `--payment-token, -p`: Payment token symbol (required)

## Error Handling

### Configuration Errors

```
❌ Configuration validation failed:
  - Data feed minPrice (10) must be less than maxPrice (5)
  - Minter instantFee (150%) should be between 0 and 100
```

**Fix**: Update token config file with valid values.

### Missing Dependencies

```
❌ Network infrastructure not found for devnet. Missing: AC Role Global, AC
Please run: yarn deploy:network --network devnet
```

**Fix**: Run the suggested command to deploy missing dependencies.

### Missing Addresses

```
❌ AC Role not found for token mTBILL on devnet
```

**Fix**: Deploy missing component first or update `addresses.ts`.

## Best Practices

### 1. Use `deploy:all` for New Deployments

For most cases, use the all-in-one command:

```bash
yarn deploy:all --mtoken mTBILL --network devnet
```

It handles network infrastructure automatically and deploys everything in the correct order.

### 2. Addresses Are Automatically Saved

After successful deployment, addresses are **automatically saved and formatted** to `common/addresses.ts`. No manual updates needed!

The system:

- ✅ Automatically formats addresses with proper indentation
- ✅ Sorts networks and tokens consistently
- ✅ Preserves all existing addresses
- ✅ Uses Prettier for consistent code formatting

### 3. Test on Localnet First

For rapid iteration and testing, deploy to a local Solana validator:

**Prerequisites:**

- Solana CLI installed (`solana --version`)
- Anchor CLI installed (`anchor --version`)

**Setup:**

1. **Start local validator** (in a separate terminal):

```bash
solana-test-validator
```

This starts a local Solana node on `http://127.0.0.1:8899`.

2. **Build and deploy programs** (in another terminal):

```bash
# Build programs
anchor build

# Deploy programs to localnet
anchor deploy --provider.cluster localnet
```

Program addresses are defined in `Anchor.toml` under `[programs.localnet]`.

3. **Deploy token infrastructure**:

```bash
# Deploy complete token infrastructure to localnet
yarn deploy:all --mtoken mTBILL --network localnet
```

4. **Verify deployment**:

Check that addresses were saved to `common/addresses.ts` and verify on-chain using Solana explorer or CLI tools.

**Notes:**

- Localnet addresses are initialized in `common/addresses.ts` with placeholder values
- **Network infrastructure is automatically deployed** on first token deployment if missing
- Token-specific addresses are automatically populated and saved during deployment
- Addresses are automatically persisted to `common/addresses.ts` with proper formatting
- Local validator resets on restart, so addresses will be different each time

**Benefits:**

- ✅ Fast iteration (no network latency)
- ✅ Free (no SOL costs)
- ✅ Isolated testing environment
- ✅ Easy to reset and start fresh

### 4. Test on Devnet Before Mainnet

Always test full deployment workflow on devnet before mainnet:

```bash
# 1. Deploy on devnet
yarn deploy:all --mtoken mTBILL --network devnet

# 2. Verify deployment
# Check that addresses were saved to common/addresses.ts
# Verify on-chain using Solana explorer or CLI tools

# 3. Add payment tokens
yarn add:payment-token --mtoken mTBILL --network devnet --payment-token USDC

# 4. Run integration tests
yarn test
```

### 5. Version Control addresses.ts

Addresses are automatically saved after deployment. Always commit `addresses.ts` changes with deployment details:

```bash
git add common/addresses.ts
git commit -m "deploy: add mTBILL devnet addresses"
```

**Note**: Since addresses are automatically saved, you'll see changes to `addresses.ts` after each deployment. Review and commit these changes as part of your deployment workflow.

## Troubleshooting

### Q: How do I redeploy a component?

Remove it from `addresses.ts` and run deployment again. The system will deploy missing components.

### Q: Can I use the same config for multiple networks?

Yes! Token configs support multiple networks in a single file. Shared values (metadata, tokenAuthority) are defined once, and network-specific values (dataFeed, minter, redeemer) are defined per network in the `networks` object.

### Q: What's the difference between `deploy:all` and `deploy:token-core`?

- `deploy:all` → Deploys network infrastructure + full token (everything)
- `deploy:token-core` → Deploys only core token components (AC Role, mToken, Token Authority)

Use `deploy:all` for complete deployments, use `deploy:token-core` if you want to deploy components incrementally.

## Contributing

When adding new deployment functionality:

1. **Add orchestrator function** in `scripts/deploy/orchestrators/`
2. **Add CLI task** in `scripts/tasks/`
3. **Update package.json** with new script
4. **Add types/validation** in `scripts/configs/types.ts`
5. **Update this README**

## Related Files

- [`configs/tokens/`](../configs/tokens/) - Token configurations (includes network-specific configs)
- [`common/addresses.ts`](../common/addresses.ts) - Deployed addresses
- [`package.json`](../package.json) - Deployment scripts
