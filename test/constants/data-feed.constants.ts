import { PublicKey } from "@solana/web3.js";

export const DATA_FEED_PROGRAM_ID = new PublicKey(
  "3gzjMNSbos3eXopGnzHqQ137htQwCjG93N4f9T6avoim"
);

export const DATA_FEED_SEEDS = {
  MANUAL_FEED_STATE_SEED: "manual_feed_state",
};

export const SWITCHBOARD_FEEDS = {};

export enum DataFeedMode {}

export enum DataFeedError {
  InvalidUnderlyingFeedProvided = 6000,
  NotAuthority,
  PriceIsStale,
  InvalidStaleness,
  InvalidMinPrice,
  InvalidMaxPrice,
  InvalidUnderlyingFeed,
}
