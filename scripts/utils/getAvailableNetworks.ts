import { tokenConfigs } from '../configs/tokens';
import { tokenConfigWithNetworksSchema } from '../configs/types';

export function getAvailableNetworks(): string[] {
  const networks = new Set<string>();
  for (const config of Object.values(tokenConfigs)) {
    const parseResult = tokenConfigWithNetworksSchema.safeParse(config);
    if (parseResult.success) {
      for (const network of Object.keys(parseResult.data.networks)) {
        networks.add(network);
      }
    }
  }
  return Array.from(networks);
}
