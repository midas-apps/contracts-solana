import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { getAddress } from 'viem';

import { createUserError } from '@/common/errorHandler';
import { DataFeedConfig } from '@/scripts/configs/types';
import { PRICE_MULTIPLIER } from '@/scripts/constants/pricing';

import { deployDataFeed as deployDataFeedContract, getDataFeedProgram } from '../deploy/dataFeed';
import { deployManualFeed } from '../deploy/feeds/manual';
import { deployPythFeed } from '../deploy/feeds/pyth';
import { deploySwitchboardFeed, verifySwitchboardFeed } from '../deploy/feeds/switchboard';

export interface DeployFeedParams {
  provider: AnchorProvider;
  payer: Wallet;
  network: string;
  acRole: PublicKey;
  dataFeedConfig: DataFeedConfig;
}

export interface DeployFeedResult {
  dataFeed: PublicKey;
  underlyingFeed: PublicKey | undefined;
}

export async function deployFeedFromConfig({
  provider,
  payer,
  network,
  acRole,
  dataFeedConfig,
}: DeployFeedParams): Promise<DeployFeedResult> {
  const mode = dataFeedConfig.mode;
  const underlyingFeed = dataFeedConfig.underlyingFeed
    ? new PublicKey(dataFeedConfig.underlyingFeed)
    : undefined;

  const feedConfig = {
    acRole,
    underlyingFeed,
    minPrice: BigInt(Math.floor(parseFloat(dataFeedConfig.minPrice) * PRICE_MULTIPLIER)),
    maxPrice: BigInt(Math.floor(parseFloat(dataFeedConfig.maxPrice) * PRICE_MULTIPLIER)),
    maxStaleness: dataFeedConfig.maxStaleness,
    initialPrice: dataFeedConfig.initialPrice
      ? BigInt(Math.floor(parseFloat(dataFeedConfig.initialPrice) * PRICE_MULTIPLIER))
      : undefined,
  };

  switch (mode) {
    case 'switchboard': {
      const { env, ethRpc, ethDataFeed, feedName } = dataFeedConfig.switchboard!;

      let switchboardFeed: PublicKey;
      if (underlyingFeed) {
        const feedExists = await verifySwitchboardFeed(provider, underlyingFeed, env);
        if (!feedExists) {
          throw createUserError(
            `Switchboard feed at ${underlyingFeed.toString()} does not exist on-chain`,
            ['Verify the feed address is correct or deploy a new feed'],
          );
        }
        switchboardFeed = underlyingFeed;
      } else {
        switchboardFeed = await deploySwitchboardFeed(
          { provider, payer, network },
          {
            env,
            feedName,
            ethRpc,
            ethDataFeed: getAddress(ethDataFeed),
          },
        );
      }

      const dataFeed = await deployDataFeedContract(
        { provider, payer, network },
        {
          ...feedConfig,
          underlyingFeed: switchboardFeed,
          mode: 'switchboard',
        },
      );

      return {
        dataFeed,
        underlyingFeed: switchboardFeed,
      };
    }

    case 'pyth': {
      if (!underlyingFeed) throw createUserError('underlyingFeed is required for pyth mode');
      const dataFeed = await deployPythFeed(
        { provider, payer, network },
        { ...feedConfig, underlyingFeed },
      );
      return {
        dataFeed,
        underlyingFeed,
      };
    }

    // case 'chainlink': {
    //   if (!underlyingFeed) throw createUserError('underlyingFeed is required for chainlink mode');
    //   const dataFeed = await deployChainlinkFeed(
    //     { provider, payer, network },
    //     { ...feedConfig, underlyingFeed },
    //   );
    //   return {
    //     dataFeed,
    //     underlyingFeed,
    //   };
    // }

    case 'manual': {
      const dataFeed = await deployManualFeed({ provider, payer, network }, feedConfig);
      // For manual feeds, the underlying feed is a PDA derived from the data feed
      const dataFeedProgram = getDataFeedProgram(provider);
      const [manualFeedPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('manual_feed_state'), dataFeed.toBuffer()],
        dataFeedProgram.programId,
      );
      return {
        dataFeed,
        underlyingFeed: manualFeedPda,
      };
    }

    default:
      throw createUserError(`Unsupported feed mode: ${mode}`, [
        'Supported modes: switchboard, pyth, chainlink, manual',
      ]);
  }
}
