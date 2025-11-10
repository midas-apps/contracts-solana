import { createUserError } from '@/common/errorHandler';
import { MProduct } from '@/common/tokenTypes';
import { tokenConfigs } from '@/scripts/configs/tokens';

import { TokenConfig, tokenConfigSchema, tokenConfigWithNetworksSchema } from './types';

export function loadTokenConfig(tokenSymbol: MProduct, network: string): TokenConfig {
  const config = tokenConfigs[tokenSymbol];
  if (!config) {
    throw createUserError(`Token config not found: ${tokenSymbol}`, [
      `Available tokens: ${Object.keys(tokenConfigs).join(', ') || 'none'}`,
    ]);
  }

  const parseResult = tokenConfigWithNetworksSchema.safeParse(config);
  if (!parseResult.success) {
    const errors = parseResult.error.issues
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw createUserError(`Invalid config format for ${tokenSymbol}`, [
      'Check the token configuration file',
      `Errors:\n${errors}`,
    ]);
  }

  const { networks, ...baseConfig } = parseResult.data;
  if (!networks[network]) {
    throw createUserError(`Network '${network}' not found for ${tokenSymbol}`, [
      `Available networks: ${Object.keys(networks).join(', ') || 'none'}`,
    ]);
  }

  const merged = { ...baseConfig, ...networks[network] };
  return tokenConfigSchema.parse(merged);
}
