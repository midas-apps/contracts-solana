import { PublicKey } from '@solana/web3.js';

import {
  deployDataFeed,
  DeployDataFeedConfig,
  CommonParams,
  DeployDataFeedBaseConfig,
} from '../dataFeed';

export interface DeployPythFeedParams {
  underlyingFeed: PublicKey;
}

/**
 * Deploy a data feed using Pyth as the underlying feed
 * Requires an existing Pyth feed address
 */
export async function deployPythFeed(
  common: CommonParams,
  paramsCommon: DeployDataFeedBaseConfig,
  params: DeployPythFeedParams,
): Promise<PublicKey> {
  const config: DeployDataFeedConfig = {
    ...paramsCommon,
    mode: 'pyth',
    underlyingFeed: params.underlyingFeed,
  };

  return await deployDataFeed(common, config);
}
