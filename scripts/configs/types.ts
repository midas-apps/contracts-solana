import { z } from 'zod';

import { PaymentToken } from '@/common/tokenTypes';

import { publicKeySchema } from './common-schemas';
import { grantRolesConfigSchema } from './roles-types';

/**
 * Validates price strings (e.g., "0.1", "100000")
 * - Must be a valid decimal number
 * - Must be greater than 0
 */
const priceSchema = z
  .string()
  .refine((val) => /^\d+\.?\d*$/.test(val), {
    message: 'Price must be a positive decimal number (e.g., "1.5", "100")',
  })
  .refine((val) => parseFloat(val) > 0, {
    message: 'Price must be greater than 0',
  });

/**
 * Validates monetary amount strings (e.g., fees, limits, allowances)
 * - Must be a valid decimal number
 * - Must be non-negative (0 or greater)
 */
const monetaryAmountSchema = z
  .string()
  .refine((val) => /^\d+\.?\d*$/.test(val), {
    message: 'Amount must be a non-negative decimal number (e.g., "0", "1.5", "1000")',
  })
  .refine((val) => parseFloat(val) >= 0, {
    message: 'Amount must be non-negative',
  });

/**
 * Validates Ethereum address format (0x + 40 hex characters)
 */
const ethereumAddressSchema = z.string().refine((val) => /^0x[a-fA-F0-9]{40}$/.test(val), {
  message: 'Must be a valid Ethereum address (0x followed by 40 hex characters)',
});

export const dataFeedModeSchema = z.enum(['switchboard', 'pyth', 'manual']);

export const switchboardConfigSchema = z.object({
  env: z.enum(['devnet', 'mainnet']),
  ethRpc: z.url(),
  ethDataFeed: ethereumAddressSchema,
  feedName: z.string(), // e.g., "mTBILL/USD", "mRe7SOL/SOL"
});

export const dataFeedConfigSchema = z
  .object({
    mode: dataFeedModeSchema,
    underlyingFeed: publicKeySchema.optional(),
    minPrice: priceSchema,
    maxPrice: priceSchema,
    maxStaleness: z.number().int().positive(),
    initialPrice: priceSchema.optional(),
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
  // underlyingFeed behavior varies by mode:
  // - switchboard: optional. If not provided, deploys new Switchboard oracle feed.
  //   If provided, uses existing Switchboard feed.
  // - manual: optional. If not provided, creates a new manual feed PDA internally.
  //   If provided, uses the specified feed address.
  // - pyth: required. Must reference an existing oracle feed address.
  .refine(
    (data) => {
      // Pyth mode: underlyingFeed is required
      if (data.mode === 'pyth') {
        return data.underlyingFeed !== undefined;
      }
      return true;
    },
    {
      message: 'underlyingFeed is required for pyth mode',
      path: ['underlyingFeed'],
    },
  )
  .refine(
    (data) => {
      // Ensure minPrice < maxPrice
      return parseFloat(data.minPrice) < parseFloat(data.maxPrice);
    },
    {
      message: 'minPrice must be less than maxPrice',
      path: ['minPrice'],
    },
  )
  .refine(
    (data) => {
      // Ensure initialPrice is within [minPrice, maxPrice] when provided
      if (data.initialPrice === undefined) return true;
      const initial = parseFloat(data.initialPrice);
      const min = parseFloat(data.minPrice);
      const max = parseFloat(data.maxPrice);
      return initial >= min && initial <= max;
    },
    {
      message: 'initialPrice must be between minPrice and maxPrice',
      path: ['initialPrice'],
    },
  );

export const tokenMetadataSchema = z.object({
  name: z.string(),
  symbol: z.string(),
  decimals: z.number().int().min(0).max(18).default(9),
  uri: z.url().optional(),
});

export const tokenAuthorityConfigSchema = z.object({
  seed: z
    .string()
    .min(8, 'Seed must be at least 8 characters for security')
    .max(32, 'Seed must not exceed 32 characters')
    .regex(/^[a-z0-9-]+$/, 'Seed must only contain lowercase letters, numbers, and hyphens'),
});

export const paymentTokenConfigSchema = z.object({
  symbol: z
    .string()
    .refine((val) => Object.values(PaymentToken).includes(val as PaymentToken), {
      message: `Invalid payment token symbol. Must be one of: ${Object.values(PaymentToken).join(', ')}`,
    })
    .transform((val) => val as PaymentToken),
  fee: monetaryAmountSchema,
  allowance: monetaryAmountSchema,
  stable: z.boolean(),
  isFiat: z.boolean().default(false),
});

export const minterVaultConfigSchema = z.object({
  instantFee: monetaryAmountSchema,
  instantDailyLimit: monetaryAmountSchema,
  variationTolerance: monetaryAmountSchema,
  minAmount: monetaryAmountSchema,
  firstMintMinMTokens: monetaryAmountSchema,
  maxSupplyCap: monetaryAmountSchema.optional(),
  greenListEnforced: z.boolean().default(false),
  tokensReceiver: publicKeySchema,
  feeReceiver: publicKeySchema,
  paymentTokens: z.array(paymentTokenConfigSchema),
});

export const redeemerVaultConfigSchema = z.object({
  instantFee: monetaryAmountSchema,
  instantDailyLimit: monetaryAmountSchema,
  variationTolerance: monetaryAmountSchema,
  minAmount: monetaryAmountSchema,
  minFiatRedeemAmount: monetaryAmountSchema,
  fiatFlatFee: monetaryAmountSchema,
  greenListEnforced: z.boolean().default(false),
  tokensReceiver: publicKeySchema,
  feeReceiver: publicKeySchema,
  requestRedeemer: publicKeySchema,
  paymentTokens: z.array(paymentTokenConfigSchema),
});

export const timelockConfigSchema = z.object({
  delay: z.number().int().positive(),
  member: publicKeySchema,
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

export const networkConfigSchema = z.record(z.string(),
  z.object({
    timelock: timelockConfigSchema.optional(),
  })
);

export type NetworkConfig = z.infer<typeof networkConfigSchema>;
export type DataFeedConfig = z.infer<typeof dataFeedConfigSchema>;
export type TokenConfig = z.infer<typeof tokenConfigSchema>;
export type TokenConfigWithNetworks = z.infer<typeof tokenConfigWithNetworksSchema>;
export type PaymentTokenDeploymentConfig = z.infer<typeof paymentTokenDeploymentConfigSchema>;
export type PaymentTokenNetworkConfig = z.infer<typeof paymentTokenNetworkConfigSchema>;
export type PaymentTokenConfigWithNetworks = z.infer<typeof paymentTokenConfigWithNetworksSchema>;
