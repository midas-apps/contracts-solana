import { createUserError } from '@/common/errorHandler';
import { PaymentToken } from '@/common/tokenTypes';
import { paymentTokenConfigs } from '@/scripts/configs/tokens/payment-tokens';

import { PaymentTokenDeploymentConfig, paymentTokenDeploymentConfigSchema } from './types';

export function loadPaymentTokenConfig(paymentToken: PaymentToken): PaymentTokenDeploymentConfig {
  const config = paymentTokenConfigs[paymentToken];
  if (!config) {
    throw createUserError(`Payment token config not found: ${paymentToken}`);
  }

  const parseResult = paymentTokenDeploymentConfigSchema.safeParse(config);
  if (!parseResult.success) {
    const errors = parseResult.error.issues
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('\n');
    throw createUserError(`Invalid config format for ${paymentToken}: ${errors}`);
  }

  return parseResult.data;
}
