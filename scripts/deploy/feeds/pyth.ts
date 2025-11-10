import { PublicKey } from '@solana/web3.js';

import { deployDataFeed, DeployDataFeedConfig, CommonParams } from '../dataFeed';

export interface DeployPythFeedParams {
  acRole: PublicKey;
  underlyingFeed: PublicKey;
  minPrice: bigint;
  maxPrice: bigint;
  maxStaleness: number;
}

/**
 * Deploy a data feed using Pyth as the underlying feed
 * Requires an existing Pyth feed address
 */
export async function deployPythFeed(
  common: CommonParams,
  params: DeployPythFeedParams,
): Promise<PublicKey> {
  const config: DeployDataFeedConfig = {
    acRole: params.acRole,
    mode: 'pyth',
    underlyingFeed: params.underlyingFeed,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    maxStaleness: params.maxStaleness,
  };

  return await deployDataFeed(common, config);
}
