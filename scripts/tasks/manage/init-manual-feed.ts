import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { Transaction } from '@solana/web3.js';

import { createUserError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';
import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';
import { DATA_FEED_AC_ROLES } from '@/test/constants/data-feed.constants';
import { getAccountAcRoleStatePda } from '@/test/helpers/ac.helpers';
import { fromBN, toBN } from '@/test/helpers/common.helpers';
import {
  fetchDataFeedState,
  fetchManualFeedState,
  getManualFeedStatePda,
} from '@/test/helpers/data-feed.helpers';

import { getDataFeedProgram } from '../../deploy/dataFeed';
import { getTokenAddresses } from '../../utils/addressQueries';
import { getMtoken, getNetwork, getOptionalArg } from '../../utils/argumentParser';

/**
 * Initialize ManualFeedState for an existing FeedState.
 *
 * Use this script when:
 * - A manual feed deployment was interrupted after FeedState creation
 * - The ManualFeedState PDA doesn't exist but FeedState does
 *
 * Usage:
 *   yarn tsx scripts/tasks/manage/init-manual-feed.ts --mtoken solmFONE --network mainnet --price 1.05 --decimals 9
 */
async function main(provider: AnchorProvider, payer: Wallet) {
  const mtoken = getMtoken();
  const network = getNetwork();
  const priceArg = getOptionalArg('price');
  const decimalsArg = getOptionalArg('decimals');

  console.log(`\n🔧 Initializing ManualFeedState for ${mtoken} on ${network}`);

  // Get token addresses
  const tokenAddrs = getTokenAddresses(network, mtoken);
  if (!tokenAddrs?.mTokenDataFeed) {
    throw createUserError(`Data feed not found for ${mtoken} on ${network}`, [
      `Run: yarn deploy:token-datafeed --mtoken ${mtoken} --network ${network}`,
    ]);
  }

  const feedProgram = getDataFeedProgram(provider);
  const feedState = await fetchDataFeedState(feedProgram, tokenAddrs.mTokenDataFeed);

  if (!feedState) {
    throw createUserError(`FeedState not found at ${tokenAddrs.mTokenDataFeed}`, [
      'The FeedState account does not exist on-chain',
      `Run: yarn deploy:token-datafeed --mtoken ${mtoken} --network ${network}`,
    ]);
  }

  // Check if feed is manual mode
  if (!('manual' in feedState.mode)) {
    throw createUserError('This feed is not in manual mode', [
      `Current mode: ${Object.keys(feedState.mode)[0]}`,
      'Only manual feeds can be initialized with this script',
    ]);
  }

  // Get manual feed PDA
  const manualFeedPda = getManualFeedStatePda(tokenAddrs.mTokenDataFeed);

  // Check if ManualFeedState already exists
  const existingManualFeed = await fetchManualFeedState(feedProgram, manualFeedPda);
  if (existingManualFeed) {
    console.log(`\n✅ ManualFeedState already exists at ${manualFeedPda.toString()}`);
    console.log(
      `   Current price: ${fromBN(existingManualFeed.price)} (decimals: ${existingManualFeed.decimals})`,
    );
    console.log(
      `   Last updated: ${new Date(existingManualFeed.lastUpdatedAt * 1000).toISOString()}`,
    );
    return;
  }

  // Parse initial price (required)
  if (!priceArg) {
    throw createUserError('--price is required', ['Example: --price 1.05']);
  }

  // Parse decimals (required)
  if (!decimalsArg) {
    throw createUserError('--decimals is required', ['Example: --decimals 9']);
  }
  const decimals = parseInt(decimalsArg, 10);
  if (isNaN(decimals) || decimals < 0 || decimals > 18) {
    throw createUserError('Invalid --decimals value', [
      'Must be an integer between 0 and 18',
      `Provided: ${decimalsArg}`,
    ]);
  }

  // Calculate price with the specified decimals
  const priceMultiplier = 10 ** decimals;
  const initialPrice = BigInt(Math.round(parseFloat(priceArg) * priceMultiplier));

  // The caller must have FEED_ADMIN role on the AC Role
  const authorityAcRolePda = getAccountAcRoleStatePda(
    feedState.acRole,
    payer.publicKey,
    DATA_FEED_AC_ROLES.FEED_ADMIN,
  );

  console.log('\n📋 Initialization Details:');
  console.log(`   FeedState: ${tokenAddrs.mTokenDataFeed.toString()}`);
  console.log(`   ManualFeedState PDA: ${manualFeedPda.toString()}`);
  console.log(`   AC Role: ${feedState.acRole.toString()}`);
  console.log(`   Authority: ${payer.publicKey.toString()}`);
  console.log(`   Initial Price: ${Number(initialPrice) / priceMultiplier} (raw: ${initialPrice})`);
  console.log(`   Decimals: ${decimals}`);

  console.log('\n📝 Creating ManualFeedState...');

  const initManualFeedTx = new Transaction().add(
    await feedProgram.methods
      .newManualFeed(toBN(initialPrice), decimals)
      .accountsPartial({
        authority: payer.publicKey,
        manualFeed: manualFeedPda,
        acRole: feedState.acRole,
        authorityAcRole: authorityAcRolePda,
        baseFeed: tokenAddrs.mTokenDataFeed,
      })
      .instruction(),
  );

  const txResult = await sendAndWaitForCustomSolanaTxSign(provider, initManualFeedTx, [], {
    action: 'update-feed-mtoken',
    comment: `Initialize ManualFeedState for ${mtoken}`,
    mToken: mtoken,
    waitForTx: false,
  });

  if (txResult.signature) {
    console.log(`\n✅ ManualFeedState initialized successfully!`);
    console.log(`📝 Transaction: ${txResult.signature}`);
    console.log(`\n📊 Summary:`);
    console.log(`   ManualFeedState: ${manualFeedPda.toString()}`);
    console.log(`   Initial Price: ${Number(initialPrice) / priceMultiplier}`);
    console.log(`   Decimals: ${decimals}\n`);
  } else {
    console.log(`\n✓ Transaction created | Fordefi TX ID: ${txResult.txId}`);
    console.log(`⏳ Awaiting approval in Fordefi dashboard`);
    console.log(`   This transaction requires multi-sig approval before mining.\n`);
  }
}

const network = getNetwork();
const mtoken = getOptionalArg('mtoken') || getOptionalArg('m');
executeNetworkScript(network, main, 'update-feed-mtoken', mtoken);

// Usage: yarn tsx scripts/tasks/manage/init-manual-feed.ts --mtoken solmFONE --network mainnet --price 1.04757758 --decimals 8
