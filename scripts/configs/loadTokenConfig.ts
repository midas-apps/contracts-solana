import { MProduct } from '@/common/tokenTypes';
import { tokenConfigs } from '@/scripts/configs/tokens';

import { TokenConfig, tokenConfigSchema, tokenConfigWithNetworksSchema } from './types';

export function loadTokenConfig(tokenSymbol: MProduct, network: string): TokenConfig {
  const config = tokenConfigs[tokenSymbol];
  if (!config) {
    throw new Error(
      `Token config not found: ${tokenSymbol}. Available: ${Object.keys(tokenConfigs).join(', ') || 'none'}`,
    );
  }

  const parseResult = tokenConfigWithNetworksSchema.safeParse(config);
  if (!parseResult.success) {
    const errors = parseResult.error.issues
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw new Error(`Invalid config format for ${tokenSymbol}:\n${errors}`);
  }

  const { networks, ...baseConfig } = parseResult.data;
  if (!networks[network]) {
    throw new Error(
      `Network '${network}' not found for ${tokenSymbol}. Available: ${Object.keys(networks).join(', ') || 'none'}`,
    );
  }

  const merged = { ...baseConfig, ...networks[network] };
  return tokenConfigSchema.parse(merged);
}
