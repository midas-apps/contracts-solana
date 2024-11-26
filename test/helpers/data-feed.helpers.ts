import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";

import { DataFeedProgram, findPDA } from "./common.helpers";
import {
  DATA_FEED_PROGRAM_ID,
  DATA_FEED_SEEDS,
} from "../constants/data-feed.constants";

export const DataFeedMode = {
  manual: { manual: {} },
  switchboard: { switchboard: {} },
};
export const generateFeedAcccount = () => {
  return Keypair.generate();
};

export const fetchDataFeedState = (
  program: DataFeedProgram,
  feed: PublicKey
) => {
  return program.account.feedState.fetchNullable(feed);
};

export const fetchManualFeedState = (
  program: DataFeedProgram,
  feed: PublicKey
) => {
  return program.account.manualFeedState.fetchNullable(feed);
};

export const getManualFeedStatePda = (feedPda: PublicKey) => {
  const [pda] = findPDA(
    [DATA_FEED_SEEDS.MANUAL_FEED_STATE_SEED, feedPda],
    DATA_FEED_PROGRAM_ID
  );
  return pda;
};
