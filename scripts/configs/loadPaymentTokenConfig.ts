import { createUserError } from '@/common/errorHandler';
import { PaymentToken } from '@/common/tokenTypes';
import { paymentTokenConfigs } from '@/scripts/configs/tokens/payment-tokens';

import {
  PaymentTokenDeploymentConfig,
  paymentTokenConfigWithNetworksSchema,
  paymentTokenNetworkConfigSchema,
} from './types';

export function loadPaymentTokenConfig(
  paymentToken: PaymentToken,
  network: string,
): PaymentTokenDeploymentConfig {
  const config = paymentTokenConfigs[paymentToken];
  if (!config) {
    throw createUserError(`Payment token config not found: ${paymentToken}`, [
      `Available tokens: ${Object.keys(paymentTokenConfigs).join(', ')}`,
    ]);
  }

  // Validate the full config structure
  const configParseResult = paymentTokenConfigWithNetworksSchema.safeParse(config);
  if (!configParseResult.success) {
    const errors = configParseResult.error.issues
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw createUserError(`Invalid config format for ${paymentToken}: ${errors}`);
  }

  // Get network-specific config
  const networkConfig = configParseResult.data.networks[network];
  if (!networkConfig) {
    throw createUserError(`Network config not found for ${paymentToken} on ${network}`, [
      `Available networks: ${Object.keys(configParseResult.data.networks).join(', ')}`,
    ]);
  }

  // Validate network-specific config
  const networkParseResult = paymentTokenNetworkConfigSchema.safeParse(networkConfig);
  if (!networkParseResult.success) {
    const errors = networkParseResult.error.issues
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw createUserError(`Invalid network config for ${paymentToken} on ${network}: ${errors}`);
  }

  // Return as PaymentTokenDeploymentConfig
  // Note: tokenAddress will be validated later - either from config or addresses.ts
  return {
    metadata: configParseResult.data.metadata,
    tokenAddress: networkParseResult.data.tokenAddress || 'placeholder', // Will be overridden from addresses.ts
    dataFeed: networkParseResult.data.dataFeed,
  };
}
