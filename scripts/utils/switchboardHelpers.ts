import { AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey, Transaction } from '@solana/web3.js';

import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';

import { getSwitchboardPullInx } from '../deploy/feeds/switchboard';

export interface SwitchboardFeedInfo {
  feed: PublicKey;
  isSwitchboard: boolean;
}

/**
 * Pulls Switchboard feeds if needed
 *
 * @returns Transaction signature if feeds were pulled, null if no Switchboard feeds
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

  // Fetch all pull instructions first (these involve network calls)
  const pullInstructions = await Promise.all(
    switchboardFeeds.map(async (feedInfo) => {
      console.log('Pulling Switchboard feed...');
      return getSwitchboardPullInx(provider, feedInfo.feed, env);
    }),
  );

  const tx = new Transaction();
  pullInstructions.forEach((ix) => tx.add(ix));

  const result = await sendAndWaitForCustomSolanaTxSign(provider, tx, [], {});

  console.log('Switchboard feeds pulled:', result.signature);
  return result.signature ?? null;
}
