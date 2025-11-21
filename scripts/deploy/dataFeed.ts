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

export interface DeployDataFeedConfig {
  acRole: PublicKey;
  feed?: Keypair;
  mode: keyof typeof DataFeedMode;
  underlyingFeed: PublicKey;
  minPrice: bigint;
  maxPrice: bigint;
  maxStaleness: number;
}

export const deployDataFeed = async (
  common: CommonParams,
  { feed, underlyingFeed, mode, acRole, maxPrice, maxStaleness, minPrice }: DeployDataFeedConfig,
) => {
  feed ??= Keypair.generate();

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

  await sendAndWaitForCustomSolanaTxSign(common.provider, common.network, tx, [feed], {
    action: 'deployer',
    comment: 'Deploy Data Feed',
    waitForTx: true,
    pollingIntervalMs: 1000,
    timeoutDurationMs: 120 * 1000,
  });

  return feed.publicKey;
};
