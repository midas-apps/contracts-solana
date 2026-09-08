import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import { getAddress } from 'viem';

import { createUserError } from '@/common/errorHandler';
import { DataFeedConfig } from '@/scripts/configs/types';
import { MANUAL_PRICE_MULTIPLIER, PRICE_MULTIPLIER } from '@/scripts/constants/pricing';

import { deployDataFeed as deployDataFeedContract, getDataFeedProgram } from '../deploy/dataFeed';
import { deployChainlinkFeed } from '../deploy/feeds/chainlink';
import { deployManualFeed, deployManualFeedGrowth } from '../deploy/feeds/manual';
import { deployPythFeed } from '../deploy/feeds/pyth';
import { deploySwitchboardFeed, verifySwitchboardFeed } from '../deploy/feeds/switchboard';

export interface DeployFeedParams {
  provider: AnchorProvider;
  payer: Wallet;
  network: string;
  acRole: PublicKey;
  dataFeedConfig: DataFeedConfig;
  isPaymentToken?: boolean;
  existingDataFeed?: PublicKey;
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
  existingDataFeed,
  isPaymentToken,
}: DeployFeedParams): Promise<DeployFeedResult> {
  const mode = dataFeedConfig.mode;

  const feedConfig = {
    acRole,
    isPaymentToken: !!isPaymentToken,
    existingDataFeed,
    minPrice: BigInt(Math.floor(parseFloat(dataFeedConfig.minPrice) * PRICE_MULTIPLIER)),
    maxPrice: BigInt(Math.floor(parseFloat(dataFeedConfig.maxPrice) * PRICE_MULTIPLIER)),
    maxStaleness: dataFeedConfig.maxStaleness,
  };

  switch (mode) {
    case 'switchboard': {
      if (!dataFeedConfig.switchboard)
        throw createUserError('switchboard configuration is required for switchboard mode');

      const {
        env,
        ethRpc,
        ethDataFeed,
        feedName,
        underlyingFeed: underlyingFeedAddress,
      } = dataFeedConfig.switchboard!;
      const underlyingFeed = underlyingFeedAddress
        ? new PublicKey(underlyingFeedAddress)
        : undefined;

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
      if (!dataFeedConfig.pyth)
        throw createUserError('pyth configuration is required for pyth mode');

      const underlyingFeed = new PublicKey(dataFeedConfig.pyth.underlyingFeed);
      const dataFeed = await deployPythFeed({ provider, payer, network }, feedConfig, {
        underlyingFeed,
      });
      return {
        dataFeed,
        underlyingFeed,
      };
    }

    case 'chainlink': {
      if (!dataFeedConfig.chainlink)
        throw createUserError('chainlink configuration is required for chainlink mode');

      const underlyingFeed = new PublicKey(dataFeedConfig.chainlink.underlyingFeed);
      const dataFeed = await deployChainlinkFeed({ provider, payer, network }, feedConfig, {
        underlyingFeed,
      });
      return {
        dataFeed,
        underlyingFeed,
      };
    }

    case 'manual': {
      const manualConfig = dataFeedConfig.manual;
      if (!manualConfig) throw createUserError('manual configuration is required for manual mode');

      const dataFeed = await deployManualFeed({ provider, payer, network }, feedConfig, {
        initialPrice: BigInt(
          Math.floor(parseFloat(manualConfig.initialPrice) * MANUAL_PRICE_MULTIPLIER),
        ),
        maxAnswerDeviation: BigInt(
          Math.floor(parseFloat(manualConfig.maxAnswerDeviation) * MANUAL_PRICE_MULTIPLIER),
        ),
      });
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

    case 'manual-growth': {
      const manualGrowthConfig = dataFeedConfig.manualGrowth;
      if (!manualGrowthConfig)
        throw createUserError('manualGrowth configuration is required for manual-growth mode');

      const dataFeed = await deployManualFeedGrowth({ provider, payer, network }, feedConfig, {
        initialPrice: BigInt(
          Math.floor(parseFloat(manualGrowthConfig.initialPrice) * MANUAL_PRICE_MULTIPLIER),
        ),
        initialPriceTimestamp: manualGrowthConfig.initialPriceTimestamp,
        initialGrowthApr: BigInt(
          Math.floor(
            parseFloat(manualGrowthConfig.initialGrowthApr.toString()) * MANUAL_PRICE_MULTIPLIER,
          ),
        ),
        minGrowthApr: BigInt(
          Math.floor(
            parseFloat(manualGrowthConfig.minGrowthApr.toString()) * MANUAL_PRICE_MULTIPLIER,
          ),
        ),
        maxGrowthApr: BigInt(
          Math.floor(
            parseFloat(manualGrowthConfig.maxGrowthApr.toString()) * MANUAL_PRICE_MULTIPLIER,
          ),
        ),
        maxAnswerDeviation: BigInt(
          Math.floor(parseFloat(manualGrowthConfig.maxAnswerDeviation) * MANUAL_PRICE_MULTIPLIER),
        ),
        onlyUp: manualGrowthConfig.onlyUp,
      });
      // For manual feeds, the underlying feed is a PDA derived from the data feed
      const dataFeedProgram = getDataFeedProgram(provider);
      const [manualFeedPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('manual_feed_growth_state'), dataFeed.toBuffer()],
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
