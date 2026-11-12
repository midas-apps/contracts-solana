import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { PublicKey, Transaction } from '@solana/web3.js';
import * as sb from '@switchboard-xyz/on-demand';

import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';

import { getSwitchboardPullInx, SWITCHBOARD_PROGRAM_IDS } from '../deploy/feeds/switchboard';

export interface SwitchboardFeedInfo {
  feed: PublicKey;
  isSwitchboard: boolean;
  maxStalenessSeconds: number;
}

/**
 * Checks if a Switchboard feed is stale and needs to be updated
 *
 * @returns true if the feed is stale and needs pulling, false if fresh
 */
async function isSwitchboardFeedStale(
  provider: AnchorProvider,
  feedPubkey: PublicKey,
  env: 'devnet' | 'mainnet',
  maxStalenessSeconds: number,
): Promise<boolean> {
  try {
    const programId = new PublicKey(SWITCHBOARD_PROGRAM_IDS[env]);
    const idl = await Program.fetchIdl(programId, provider);
    if (!idl) {
      console.log(`  Could not fetch Switchboard IDL, assuming feed is stale`);
      return true;
    }

    const program = new Program(idl, provider);
    const feedAccount = new sb.PullFeed(program, feedPubkey);
    const data = await feedAccount.loadData();

    // Get the last update timestamp (in seconds)
    const lastUpdateTimestamp = data.lastUpdateTimestamp.toNumber();
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const ageSeconds = currentTimestamp - lastUpdateTimestamp;

    console.log(
      `  Feed ${feedPubkey.toString().slice(0, 8)}... last updated ${ageSeconds}s ago (max: ${maxStalenessSeconds}s)`,
    );

    return ageSeconds > maxStalenessSeconds;
  } catch (error) {
    // If we can't check, assume stale to be safe
    console.log(
      `  Could not check feed staleness: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    return true;
  }
}

/**
 * Pulls Switchboard feeds only if they are stale
 *
 * @returns Transaction signature if feeds were pulled, null if no feeds needed updating
 */
export async function pullSwitchboardFeeds(
  provider: AnchorProvider,
  feeds: SwitchboardFeedInfo[],
  network: string,
): Promise<string | null> {
  const switchboardFeeds = feeds.filter((f) => f.isSwitchboard);

  if (switchboardFeeds.length === 0) {
    console.log('No Switchboard feeds to pull, skipping feed update transaction');
    return null;
  }

  const env = network === 'mainnet' ? 'mainnet' : 'devnet';

  // Check which feeds are stale and need updating
  console.log('Checking Switchboard feed staleness...');
  const stalenessChecks = await Promise.all(
    switchboardFeeds.map(async (feedInfo) => {
      const maxStaleness = feedInfo.maxStalenessSeconds;
      const isStale = await isSwitchboardFeedStale(provider, feedInfo.feed, env, maxStaleness);
      return { feedInfo, isStale };
    }),
  );

  const staleFeeds = stalenessChecks
    .filter((check) => check.isStale)
    .map((check) => check.feedInfo);

  if (staleFeeds.length === 0) {
    console.log('All Switchboard feeds are fresh, skipping pull transaction');
    return null;
  }

  console.log(
    `${staleFeeds.length}/${switchboardFeeds.length} Switchboard feeds are stale, pulling updates...`,
  );

  // Fetch pull instructions only for stale feeds
  const pullInstructions = await Promise.all(
    staleFeeds.map(async (feedInfo) => {
      console.log(`  Fetching update for feed ${feedInfo.feed.toString().slice(0, 8)}...`);
      return getSwitchboardPullInx(provider, feedInfo.feed, env);
    }),
  );

  const tx = new Transaction();
  pullInstructions.forEach((ix) => tx.add(ix));

  const result = await sendAndWaitForCustomSolanaTxSign(provider, tx, [], {});

  console.log('Switchboard feeds pulled:', result.signature);
  return result.signature ?? null;
}
