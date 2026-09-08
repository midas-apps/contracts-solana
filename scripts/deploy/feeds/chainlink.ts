import { PublicKey } from '@solana/web3.js';

import {
  deployDataFeed,
  DeployDataFeedConfig,
  CommonParams,
  DeployDataFeedBaseConfig,
} from '../dataFeed';

export interface DeployChainlinkFeedParams {
  underlyingFeed: PublicKey;
}

/**
 * Deploy a data feed using Chainlink OCR2 as the underlying feed
 * Requires an existing Chainlink OCR2 feed address
 */
export async function deployChainlinkFeed(
  common: CommonParams,
  paramsCommon: DeployDataFeedBaseConfig,
  params: DeployChainlinkFeedParams,
): Promise<PublicKey> {
  const config: DeployDataFeedConfig = {
    ...paramsCommon,
    mode: 'chainlink',
    underlyingFeed: params.underlyingFeed,
  };

  return await deployDataFeed(common, config);
}
