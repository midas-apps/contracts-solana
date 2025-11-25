import { PublicKey } from '@solana/web3.js';
import { z } from 'zod';

import { PaymentToken } from '@/common/tokenTypes';

import { PLACEHOLDER_FEED_ADDRESS } from '../utils/feedUtils';

import { grantRolesConfigSchema } from './roles-types';

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
  // Note: underlyingFeed is optional for switchboard mode
  // If provided, it will be used instead of deploying a new feed
  // If not provided, a new Switchboard feed will be deployed based on ethDataFeed
  .refine(
    (data) => {
      // Pyth and Chainlink modes: underlyingFeed is required and cannot be a placeholder
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

export const tokenMetadataSchema = z.object({
  name: z.string(),
  symbol: z.string(),
  decimals: z.number().int().min(0).max(18).default(9),
  uri: z.string().url().optional(),
});

export const tokenAuthorityConfigSchema = z.object({
  seed: z.string(),
});

export const paymentTokenConfigSchema = z.object({
  symbol: z
    .string()
    .refine((val) => Object.values(PaymentToken).includes(val as PaymentToken), {
      message: `Invalid payment token symbol. Must be one of: ${Object.values(PaymentToken).join(', ')}`,
    })
    .transform((val) => val as PaymentToken),
  fee: z.string(),
  allowance: z.string(),
  stable: z.boolean(),
  isFiat: z.boolean().default(false),
});

export const minterVaultConfigSchema = z.object({
  instantFee: z.string(),
  instantDailyLimit: z.string(),
  variationTolerance: z.string(),
  minAmount: z.string(),
  firstMintMinMTokens: z.string(),
  greenListEnforced: z.boolean().default(false),
  tokensReceiver: publicKeySchema,
  feeReceiver: publicKeySchema,
  paymentTokens: z.array(paymentTokenConfigSchema),
});

export const redeemerVaultConfigSchema = z.object({
  instantFee: z.string(),
  instantDailyLimit: z.string(),
  variationTolerance: z.string(),
  minAmount: z.string(),
  minFiatRedeemAmount: z.string(),
  fiatFlatFee: z.string(),
  greenListEnforced: z.boolean().default(false),
  tokensReceiver: publicKeySchema,
  feeReceiver: publicKeySchema,
  requestRedeemer: publicKeySchema,
  paymentTokens: z.array(paymentTokenConfigSchema),
});

export const tokenConfigSchema = z.object({
  metadata: tokenMetadataSchema,
  tokenAuthority: tokenAuthorityConfigSchema,
  dataFeed: dataFeedConfigSchema,
  minter: minterVaultConfigSchema,
  redeemer: redeemerVaultConfigSchema,
  grantRoles: grantRolesConfigSchema.optional(),
});

export const networkSpecificConfigSchema = z.object({
  dataFeed: dataFeedConfigSchema,
  minter: minterVaultConfigSchema,
  redeemer: redeemerVaultConfigSchema,
  grantRoles: grantRolesConfigSchema.optional(),
});

export const tokenConfigWithNetworksSchema = z.object({
  metadata: tokenMetadataSchema,
  tokenAuthority: tokenAuthorityConfigSchema,
  networks: z.record(z.string(), networkSpecificConfigSchema),
});

export const paymentTokenMetadataSchema = z.object({
  name: z.string(),
  symbol: z.string(),
  decimals: z.number().int().min(0).max(18),
});

export const paymentTokenDeploymentConfigSchema = z.object({
  metadata: paymentTokenMetadataSchema,
  tokenAddress: publicKeySchema,
  dataFeed: dataFeedConfigSchema,
});

export const paymentTokenNetworkConfigSchema = z.object({
  tokenAddress: publicKeySchema.optional(),
  dataFeed: dataFeedConfigSchema,
});

export const paymentTokenConfigWithNetworksSchema = z.object({
  metadata: paymentTokenMetadataSchema,
  networks: z.record(z.string(), paymentTokenNetworkConfigSchema),
});

export type DataFeedConfig = z.infer<typeof dataFeedConfigSchema>;
export type TokenConfig = z.infer<typeof tokenConfigSchema>;
export type TokenConfigWithNetworks = z.infer<typeof tokenConfigWithNetworksSchema>;
export type PaymentTokenDeploymentConfig = z.infer<typeof paymentTokenDeploymentConfigSchema>;
export type PaymentTokenNetworkConfig = z.infer<typeof paymentTokenNetworkConfigSchema>;
export type PaymentTokenConfigWithNetworks = z.infer<typeof paymentTokenConfigWithNetworksSchema>;
