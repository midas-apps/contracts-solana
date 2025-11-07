import { Keypair, PublicKey, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';

import { isPlaceholderFeed } from '@/scripts/utils/feedUtils';
import { AC_ROLES } from '@/test/constants/ac.constants';
import { DATA_FEED_AC_ROLES } from '@/test/constants/data-feed.constants';
import { getAccountAcRoleStatePda, acRoleToBuffer } from '@/test/helpers/ac.helpers';
import { toBN } from '@/test/helpers/common.helpers';
import { getManualFeedStatePda, DataFeedMode } from '@/test/helpers/data-feed.helpers';

import { getAcProgram } from '../ac';
import {
  deployDataFeed,
  DeployDataFeedConfig,
  getDataFeedProgram,
  CommonParams,
} from '../dataFeed';

export interface DeployManualFeedParams {
  acRole: PublicKey;
  underlyingFeed?: PublicKey; // Optional - if not provided, will create manual feed
  minPrice: bigint;
  maxPrice: bigint;
  maxStaleness: number;
}

/**
 * Deploy a data feed using manual feed mode
 * If underlyingFeed is not provided or is a placeholder, creates a new manual feed
 * Otherwise, uses the provided underlyingFeed address
 */
export async function deployManualFeed(
  common: CommonParams,
  params: DeployManualFeedParams,
): Promise<PublicKey> {
  const { provider, payer } = common;

  // If underlyingFeed is missing or placeholder, create manual feed
  if (!params.underlyingFeed || isPlaceholderFeed(params.underlyingFeed)) {
    // Step 1: Deploy base feed with temporary underlying feed (use manual feed PDA)
    const baseFeedKeypair = Keypair.generate();
    // Calculate the manual feed PDA that will be created later
    // This is safe because PDAs are deterministic
    const manualFeedPda = getManualFeedStatePda(baseFeedKeypair.publicKey);

    const tempConfig: DeployDataFeedConfig = {
      acRole: params.acRole,
      mode: 'manual',
      underlyingFeed: manualFeedPda, // Use manual feed PDA (will be created in step 2)
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      maxStaleness: params.maxStaleness,
      feed: baseFeedKeypair,
    };

    const feedPublicKey = await deployDataFeed(common, tempConfig);

    // Grant FEED_ADMIN role if not already granted
    const acProgram = getAcProgram(provider);
    const authorityAcRolePda = getAccountAcRoleStatePda(
      params.acRole,
      payer.publicKey,
      DATA_FEED_AC_ROLES.FEED_ADMIN,
    );

    // Attempt to grant FEED_ADMIN role (will fail silently if already exists)
    const grantRoleTx = new Transaction().add(
      await acProgram.methods
        .grantRole(acRoleToBuffer(DATA_FEED_AC_ROLES.FEED_ADMIN))
        .accountsPartial({
          account: payer.publicKey,
          acRole: params.acRole,
          authority: payer.publicKey,
          authorityAcAdminRole: getAccountAcRoleStatePda(
            params.acRole,
            payer.publicKey,
            AC_ROLES.ADMIN,
          ),
          accountAcRole: authorityAcRolePda,
        })
        .instruction(),
    );

    await sendAndConfirmTransaction(provider.connection, grantRoleTx, [payer], {
      commitment: 'finalized',
      skipPreflight: true,
    }).catch(() => {
      // Role might already exist, that's fine
    });

    // Step 2: Deploy manual feed associated with base feed
    const dataFeedProgram = getDataFeedProgram(provider);
    // Verify the PDA matches (should always be true, but good for safety)
    const manualFeedPdaVerify = getManualFeedStatePda(feedPublicKey);
    if (!manualFeedPda.equals(manualFeedPdaVerify)) {
      throw new Error('PDA mismatch - this should never happen');
    }

    const initialPrice = params.minPrice; // Use minPrice as initial price
    const manualFeedTx = new Transaction().add(
      await dataFeedProgram.methods
        .newManualFeed(toBN(initialPrice), 9)
        .accountsPartial({
          authority: payer.publicKey,
          manualFeed: manualFeedPda,
          acRole: params.acRole,
          authorityAcRole: authorityAcRolePda,
          baseFeed: feedPublicKey,
        })
        .instruction(),
    );

    await sendAndConfirmTransaction(provider.connection, manualFeedTx, [payer], {
      commitment: 'finalized',
    });

    // Step 3: Update base feed to use manual feed as underlying feed
    const updateTx = new Transaction().add(
      await dataFeedProgram.methods
        .updateFeed(
          null, // acRole - no change
          manualFeedPda, // underlyingFeed - already set, but ensure it's correct
          DataFeedMode.manual, // mode - explicitly set to manual for consistency
          null, // minPrice - no change
          null, // maxPrice - no change
          null, // maxStaleness - no change
        )
        .accountsPartial({
          authority: payer.publicKey,
          feed: feedPublicKey,
          acRole: params.acRole,
          authorityAcRole: authorityAcRolePda,
        })
        .instruction(),
    );

    await sendAndConfirmTransaction(provider.connection, updateTx, [payer], {
      commitment: 'finalized',
    });

    return feedPublicKey;
  }

  // If underlyingFeed is provided, use standard deployment
  const config: DeployDataFeedConfig = {
    acRole: params.acRole,
    mode: 'manual',
    underlyingFeed: params.underlyingFeed,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    maxStaleness: params.maxStaleness,
  };

  return await deployDataFeed(common, config);
}
