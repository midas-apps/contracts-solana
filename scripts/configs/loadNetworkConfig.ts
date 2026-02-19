import { createUserError } from '@/common/errorHandler';

import { NetworkConfig, networkConfigSchema} from './types';
import { networkConfigs } from './network-config';

export function loadNetworkConfig(network: string): NetworkConfig[string] {
  const config = networkConfigSchema.parse(networkConfigs);
  const networkConfig = config[network];

  if (!networkConfig) {
    throw createUserError(`Network config not found: ${network}`);
  }

  return networkConfig;
}
