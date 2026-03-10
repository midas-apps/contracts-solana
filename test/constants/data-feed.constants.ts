import { PublicKey } from '@solana/web3.js';

import DATA_FEED_IDL from '../../target/idl/data_feed.json' with { type: 'json' };

export const DATA_FEED_PROGRAM_ID = new PublicKey(DATA_FEED_IDL.address);

export const DATA_FEED_SEEDS = {
  MANUAL_FEED_STATE_SEED: 'manual_feed_state',
  MANUAL_FEED_GROWTH_STATE_SEED: 'manual_feed_growth_state',
};

export const SWITCHBOARD_FEEDS = {};

export enum DataFeedMode {}

export const DATA_FEED_AC_ROLES = {
  FEED_ADMIN: 'data_feed_admin',
  PRICE_UPDATER: 'price_updater',
};

export enum DataFeedError {
  InvalidUnderlyingFeedProvided = 6000,
  NotAuthority,
  PriceIsStale,
  InvalidStaleness,
  ExceedsMaxStaleness,
  InvalidMinPrice,
  InvalidMaxPrice,
  InvalidUnderlyingFeed,
  PriceIsLowerThanMin,
  PriceIsHigherThanMax,
  ArithmeticOverflow,
  DeviationTooHigh,
  InvalidMaxGrowthApr,
  InvalidMinGrowthApr,
  InvalidGrowthApr,
  InvalidPriceTimestamp,
  InvalidTimestamp,
  NotEnoughTimeHasPassedSinceLastUpdate,
  InvalidPrice,
}
