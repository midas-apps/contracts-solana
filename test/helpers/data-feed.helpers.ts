import { Keypair, PublicKey } from '@solana/web3.js';

import { DATA_FEED_PROGRAM_ID, DATA_FEED_SEEDS } from '../constants/data-feed.constants';

import { DataFeedProgram, findPDA } from './common.helpers';

export const DataFeedMode = {
  manual: { manual: {} },
  switchboard: { switchboard: {} },
  pyth: { pyth: {} },
  chainlink: { chainlink: {} },
};

export const generateFeedAcccount = () => {
  return Keypair.generate();
};

export const fetchDataFeedState = (program: DataFeedProgram, feed: PublicKey) => {
  return program.account.feedState.fetchNullable(feed);
};

export const fetchManualFeedState = (program: DataFeedProgram, feed: PublicKey) => {
  return program.account.manualFeedState.fetchNullable(feed);
};

export const getManualFeedStatePda = (feedPda: PublicKey) => {
  const [pda] = findPDA([DATA_FEED_SEEDS.MANUAL_FEED_STATE_SEED, feedPda], DATA_FEED_PROGRAM_ID);
  return pda;
};
