/* eslint-disable @typescript-eslint/no-explicit-any */
import { PublicKey } from '@solana/web3.js';

import { MProduct } from '@/common/tokenTypes';
import { tokenConfigs } from '@/scripts/configs/tokens';

import { TokenConfig, tokenConfigSchema, tokenConfigWithNetworksSchema } from './types';

/**
 * Load and validate token-specific configuration for a specific network
 * Performs two-stage validation:
 * 1. Schema validation: validates structure, types, and format (including PublicKey format)
 * 2. Business rules validation: validates numeric ranges, fee percentages, etc. (no address lookups)
 *
 * @param tokenSymbol - Token symbol (e.g., MProduct.MTBILL)
 * @param network - Network name (e.g., "devnet", "mainnet")
 * @returns Complete TokenConfig for the specified network
 */
export function loadTokenConfig(tokenSymbol: MProduct, network: string): TokenConfig {
  const config = tokenConfigs[tokenSymbol];
  if (!config) {
    const availableTokens = Object.keys(tokenConfigs).join(', ');
    throw new Error(
      `Token configuration not found: ${tokenSymbol}\nAvailable tokens: ${
        availableTokens || 'none'
      }`,
    );
  }

  // Validate and parse TokenConfigWithNetworks structure
  const parseResult = tokenConfigWithNetworksSchema.safeParse(config);
  if (!parseResult.success) {
    const errorMessages = parseResult.error.issues
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(
      `Invalid token configuration format for ${tokenSymbol}. Expected TokenConfigWithNetworks structure.\n${errorMessages}`,
    );
  }

  const configWithNetworks = parseResult.data;

  // Check if network exists
  if (!configWithNetworks.networks[network]) {
    const availableNetworks = Object.keys(configWithNetworks.networks).join(', ');
    throw new Error(
      `Network '${network}' not found in token config for ${tokenSymbol}\nAvailable networks: ${
        availableNetworks || 'none'
      }`,
    );
  }

  // Merge base config (metadata, tokenAuthority) with network-specific config
  const networkConfig = configWithNetworks.networks[network];
  const mergedConfig: TokenConfig = {
    metadata: configWithNetworks.metadata,
    tokenAuthority: configWithNetworks.tokenAuthority,
    dataFeed: networkConfig.dataFeed,
    minter: networkConfig.minter,
    redeemer: networkConfig.redeemer,
    paymentTokens: networkConfig.paymentTokens,
  };

  const validatedConfig = tokenConfigSchema.parse(mergedConfig);

  return validatedConfig;
}

/**
 * Convert string PublicKeys in config to PublicKey objects where needed
 * This is a helper for runtime conversion
 * Note: This mutates the config object, but returns it for convenience
 */
export function convertPublicKeysInConfig(config: TokenConfig): TokenConfig & {
  dataFeed: TokenConfig['dataFeed'] & {
    underlyingFeed?: PublicKey | string;
  };
  paymentTokens?: {
    symbol: string;
    mint: PublicKey | string;
    feed: PublicKey | string;
    fee: string;
    allowance: string;
    stable: boolean;
    isFiat?: boolean;
    tokenProgram?: PublicKey | string;
  }[];
} {
  // Convert underlyingFeed if it's a string
  if (typeof config.dataFeed.underlyingFeed === 'string') {
    (config.dataFeed as any).underlyingFeed = new PublicKey(config.dataFeed.underlyingFeed);
  }

  // Convert payment token addresses
  if (config.paymentTokens) {
    for (const pt of config.paymentTokens) {
      if (typeof pt.mint === 'string') {
        (pt as any).mint = new PublicKey(pt.mint);
      }
      if (typeof pt.feed === 'string') {
        (pt as any).feed = new PublicKey(pt.feed);
      }
      if (pt.tokenProgram && typeof pt.tokenProgram === 'string') {
        (pt as any).tokenProgram = new PublicKey(pt.tokenProgram);
      }
    }
  }

  return config as any;
}
