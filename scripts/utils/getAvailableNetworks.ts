import { tokenConfigs } from '../configs/tokens';
import { tokenConfigWithNetworksSchema } from '../configs/types';

export function getAvailableNetworks(): string[] {
  for (const config of Object.values(tokenConfigs)) {
    const parseResult = tokenConfigWithNetworksSchema.safeParse(config);
    if (parseResult.success) {
      return Object.keys(parseResult.data.networks);
    }
  }
  return [];
}
