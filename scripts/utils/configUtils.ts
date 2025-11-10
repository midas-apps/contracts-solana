import { createUserError } from '@/common/errorHandler';
import { MProduct, isMProduct } from '@/common/tokenTypes';
import { tokenConfigs } from '@/scripts/configs/tokens';

import { tokenConfigWithNetworksSchema } from '../configs/types';

/**
 * Get available token symbols from config files
 */
export function getAvailableTokens(): MProduct[] {
  return Object.keys(tokenConfigs).filter((key): key is MProduct => isMProduct(key));
}

/**
 * Get available networks from token configs
 * Derives networks from the first token config
 */
export function getAvailableNetworks(): string[] {
  for (const config of Object.values(tokenConfigs)) {
    const parseResult = tokenConfigWithNetworksSchema.safeParse(config);
    if (parseResult.success) {
      return Object.keys(parseResult.data.networks);
    }
  }
  return [];
}

export function validateTokenExists(tokenSymbol: MProduct): void {
  const availableTokens = getAvailableTokens();
  if (!availableTokens.includes(tokenSymbol)) {
    throw createUserError(`Token '${tokenSymbol}' not found`, [
      `Available tokens: ${availableTokens.join(', ')}`,
    ]);
  }
}

export function validateNetworkExists(network: string): void {
  const availableNetworks = getAvailableNetworks();
  if (!availableNetworks.includes(network)) {
    throw createUserError(`Network '${network}' not found`, [
      `Available networks: ${availableNetworks.join(', ')}`,
    ]);
  }
}
