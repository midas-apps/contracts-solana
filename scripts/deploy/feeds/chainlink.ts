import { PublicKey } from '@solana/web3.js';

import { deployDataFeed, DeployDataFeedConfig, CommonParams } from '../dataFeed';

export interface DeployChainlinkFeedParams {
  acRole: PublicKey;
  underlyingFeed: PublicKey;
  minPrice: bigint;
  maxPrice: bigint;
  maxStaleness: number;
}

/**
 * Deploy a data feed using Chainlink OCR2 as the underlying feed
 * Requires an existing Chainlink OCR2 feed address
 */
export async function deployChainlinkFeed(
  common: CommonParams,
  params: DeployChainlinkFeedParams,
): Promise<PublicKey> {
  const config: DeployDataFeedConfig = {
    acRole: params.acRole,
    mode: 'chainlink',
    underlyingFeed: params.underlyingFeed,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    maxStaleness: params.maxStaleness,
  };

  return await deployDataFeed(common, config);
}
