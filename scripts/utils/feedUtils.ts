import { PublicKey } from '@solana/web3.js';

/**
 * Placeholder address used to indicate that a feed should be created during deployment
 * This is the default/empty PublicKey address
 */
export const PLACEHOLDER_FEED_ADDRESS = '11111111111111111111111111111111';

/**
 * Check if an underlying feed is a placeholder/default value
 * Returns true if the feed is undefined, equals PublicKey.default, or matches the placeholder string
 *
 * @param feed - The feed PublicKey to check, or undefined
 * @returns true if the feed is a placeholder, false otherwise
 */
export function isPlaceholderFeed(feed: PublicKey | undefined): boolean {
  if (!feed) return true;
  return feed.equals(PublicKey.default) || feed.toString() === PLACEHOLDER_FEED_ADDRESS;
}
