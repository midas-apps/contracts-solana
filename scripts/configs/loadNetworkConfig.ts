import { createUserError } from '@/common/errorHandler';

import { NetworkConfig, networkConfigSchema} from './types';
import { networkConfigs } from './network-config';

export function loadNetworkConfig(network: string): NetworkConfig[string] {
  const config = networkConfigs[network];
  if (!config) {
    throw createUserError(`Network config not found: ${network}`);
  }

  const networkConfig = networkConfigSchema.parse(config);
  return networkConfig[network];
}
