import { PublicKey } from "@solana/web3.js";

export const DATA_FEED_PROGRAM_ID = new PublicKey(
  "7dTNTpTqbHCLxc1FtpCRAq5d4u1Y6WVqrAc1znVGQDxV"
);

export const DATA_FEED_SEEDS = {
  MANUAL_FEED_STATE_SEED: "manual_feed_state",
};

export const SWITCHBOARD_FEEDS = {};

export enum DataFeedMode {}

export const DATA_FEED_AC_ROLES = {
  FEED_ADMIN: "data_feed_admin",
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
}
