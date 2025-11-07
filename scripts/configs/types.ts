import { PublicKey } from '@solana/web3.js';
import { z } from 'zod';

import { PLACEHOLDER_FEED_ADDRESS } from '../utils/feedUtils';

// Helper schema for PublicKey strings
const publicKeySchema = z.string().refine(
  (val) => {
    try {
      new PublicKey(val);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Invalid PublicKey format' },
);

// Data Feed Configuration
export const dataFeedModeSchema = z.enum(['switchboard', 'pyth', 'chainlink', 'manual']);

export const switchboardConfigSchema = z.object({
  env: z.enum(['devnet', 'mainnet']),
  ethRpc: z.url(),
  ethDataFeed: z.string(),
  feedName: z.string(), // e.g., "mTBILL/USD", "mRe7SOL/SOL"
});

export const dataFeedConfigSchema = z
  .object({
    mode: dataFeedModeSchema,
    underlyingFeed: publicKeySchema.optional(),
    minPrice: z.string(),
    maxPrice: z.string(),
    maxStaleness: z.number().int().positive(),
    switchboard: switchboardConfigSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.mode === 'switchboard') {
        return data.switchboard !== undefined;
      }
      return true;
    },
    {
      message: "switchboard configuration is required when mode is 'switchboard'",
      path: ['switchboard'],
    },
  )
  .refine(
    (data) => {
      if (data.mode === 'pyth' || data.mode === 'chainlink') {
        return (
          data.underlyingFeed !== undefined && data.underlyingFeed !== PLACEHOLDER_FEED_ADDRESS
        );
      }
      return true;
    },
    {
      message:
        'underlyingFeed is required and cannot be a placeholder for pyth and chainlink modes',
      path: ['underlyingFeed'],
    },
  );

// Token Metadata
export const tokenMetadataSchema = z.object({
  name: z.string(),
  symbol: z.string(),
  decimals: z.number().int().min(0).max(18).default(9),
  uri: z.string().url().optional(),
});

// Token Authority Configuration
export const tokenAuthorityConfigSchema = z.object({
  seed: z.string(),
});

// Minter Vault Configuration
export const minterVaultConfigSchema = z.object({
  instantFee: z.string(),
  instantDailyLimit: z.string(),
  variationTolerance: z.string(),
  minAmount: z.string(),
  firstMintMinMTokens: z.string(),
  greenListEnforced: z.boolean().default(false),
  tokensReceiver: publicKeySchema.optional(),
  feeReceiver: publicKeySchema.optional(),
});

// Redeemer Vault Configuration
export const redeemerVaultConfigSchema = z.object({
  instantFee: z.string(),
  instantDailyLimit: z.string(),
  variationTolerance: z.string(),
  minAmount: z.string(),
  minFiatRedeemAmount: z.string(),
  fiatFlatFee: z.string(),
  greenListEnforced: z.boolean().default(false),
  tokensReceiver: publicKeySchema.optional(),
  feeReceiver: publicKeySchema.optional(),
  requestRedeemer: publicKeySchema.optional(),
});

// Payment Token Configuration
export const paymentTokenConfigSchema = z.object({
  symbol: z.string(),
  mint: publicKeySchema,
  feed: publicKeySchema,
  fee: z.string(),
  allowance: z.string(),
  stable: z.boolean().default(false),
  isFiat: z.boolean().default(false),
  tokenProgram: publicKeySchema.optional(),
});

// Complete Token Configuration
export const tokenConfigSchema = z.object({
  metadata: tokenMetadataSchema,
  tokenAuthority: tokenAuthorityConfigSchema,
  dataFeed: dataFeedConfigSchema,
  minter: minterVaultConfigSchema,
  redeemer: redeemerVaultConfigSchema,
  paymentTokens: z.array(paymentTokenConfigSchema).optional(),
});

// Network-specific configuration (per-network overrides)
export const networkSpecificConfigSchema = z.object({
  dataFeed: dataFeedConfigSchema,
  minter: minterVaultConfigSchema,
  redeemer: redeemerVaultConfigSchema,
  paymentTokens: z.array(paymentTokenConfigSchema).optional(),
});

// Token Configuration with Networks (new structure)
// Base config contains shared values, networks contains network-specific configs
export const tokenConfigWithNetworksSchema = z.object({
  metadata: tokenMetadataSchema,
  tokenAuthority: tokenAuthorityConfigSchema,
  networks: z.record(z.string(), networkSpecificConfigSchema),
});

// Type exports
export type DataFeedMode = z.infer<typeof dataFeedModeSchema>;
export type SwitchboardConfig = z.infer<typeof switchboardConfigSchema>;
export type DataFeedConfig = z.infer<typeof dataFeedConfigSchema>;
export type TokenMetadata = z.infer<typeof tokenMetadataSchema>;
export type TokenAuthorityConfig = z.infer<typeof tokenAuthorityConfigSchema>;
export type MinterVaultConfig = z.infer<typeof minterVaultConfigSchema>;
export type RedeemerVaultConfig = z.infer<typeof redeemerVaultConfigSchema>;
export type PaymentTokenConfig = z.infer<typeof paymentTokenConfigSchema>;
export type TokenConfig = z.infer<typeof tokenConfigSchema>;
export type NetworkSpecificConfig = z.infer<typeof networkSpecificConfigSchema>;
export type TokenConfigWithNetworks = z.infer<typeof tokenConfigWithNetworksSchema>;
