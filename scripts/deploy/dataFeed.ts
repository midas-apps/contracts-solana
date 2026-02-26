import { AnchorProvider, Program, Wallet } from '@coral-xyz/anchor';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';

import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';
import { DataFeed } from '@/target/types/data_feed';
import { toBN } from '@/test/helpers/common.helpers';
import { DataFeedMode } from '@/test/helpers/data-feed.helpers';

import DATA_FEED_IDL from '../../target/idl/data_feed.json' with { type: 'json' };

export interface CommonParams {
  provider: AnchorProvider;
  payer: Wallet;
  network: string;
}

export const getDataFeedProgram = (provider: AnchorProvider) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Program<DataFeed>(DATA_FEED_IDL as any, provider);
};

export interface DeployDataFeedBaseConfig {
  acRole: PublicKey;
  feed?: Keypair;
  minPrice: bigint;
  maxPrice: bigint;
  maxStaleness: number;
}

/**
 * Discriminated union for data feed deployments
 * - Manual and Switchboard feeds: underlyingFeed is optional (will be created if not provided)
 * - Pyth and Chainlink feeds: underlyingFeed is required (must reference existing oracle)
 */
export type DeployDataFeedConfig =
  | (DeployDataFeedBaseConfig & {
    mode: 'manual' | 'manualGrowth' | 'switchboard';
    underlyingFeed?: PublicKey;
  })
  | (DeployDataFeedBaseConfig & {
    mode: 'pyth' | 'chainlink';
    underlyingFeed: PublicKey;
  });

export const deployDataFeed = async (common: CommonParams, config: DeployDataFeedConfig) => {
  const {
    feed: feedKeypair,
    underlyingFeed,
    mode,
    acRole,
    maxPrice,
    maxStaleness,
    minPrice,
  } = config;
  const feed = feedKeypair ?? Keypair.generate();

  if ((mode === 'pyth' || mode === 'chainlink') && !underlyingFeed) {
    throw new Error(`underlyingFeed is required for ${mode} mode`);
  }

  const dataFeedProgram = getDataFeedProgram(common.provider);

  const tx = new Transaction().add(
    await dataFeedProgram.methods
      .newFeed(
        acRole,
        underlyingFeed,
        DataFeedMode[mode],
        toBN(minPrice),
        toBN(maxPrice),
        maxStaleness,
      )
      .accounts({
        feed: feed.publicKey,
        payer: common.payer.publicKey,
      })
      .instruction(),
  );

  const result = await sendAndWaitForCustomSolanaTxSign(common.provider, tx, [feed], {
    action: 'deployer',
    comment: 'Deploy Data Feed',
    waitForTx: true,
    pollingIntervalMs: 1000,
    timeoutDurationMs: 120 * 1000,
  });

  if (result.signature) {
    console.log(`Transaction signature: ${result.signature}`);
  }

  return feed.publicKey;
};
