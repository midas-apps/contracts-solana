import { PublicKey } from "@solana/web3.js";

export const DATA_FEED_PROGRAM_ID = new PublicKey(
  "3gzjMNSbos3eXopGnzHqQ137htQwCjG93N4f9T6avoim"
);

export const DATA_FEED_SEEDS = {
  FEED_STATE_SEED: "feed_state",
  MANUAL_FEED_STATE_SEED: "manual_feed_state",
};

export const SWITCHBOARD_FEEDS = {};

export enum DataFeedErrors {
  InvalidUnderlyingFeedProvided = "Invalid underlying feed provided",
  NotAuthority = "Not an authority",
  PriceIsStale = "Data feed price is stale",
}
