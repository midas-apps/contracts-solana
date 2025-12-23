import { Keypair, PublicKey, Transaction } from '@solana/web3.js';

import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';
import { PRICE_DECIMALS } from '@/scripts/constants/pricing';
import { AC_ROLES } from '@/test/constants/ac.constants';
import { DATA_FEED_AC_ROLES } from '@/test/constants/data-feed.constants';
import { getAccountAcRoleStatePda, acRoleToBuffer } from '@/test/helpers/ac.helpers';
import { toBN } from '@/test/helpers/common.helpers';
import { getManualFeedStatePda } from '@/test/helpers/data-feed.helpers';

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
 * If underlyingFeed is not provided, creates a new manual feed
 * Otherwise, uses the provided underlyingFeed address
 */
export async function deployManualFeed(
  common: CommonParams,
  params: DeployManualFeedParams,
): Promise<PublicKey> {
  const { provider, payer } = common;

  // If underlyingFeed is missing, create manual feed
  if (!params.underlyingFeed) {
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

    // Attempt to grant FEED_ADMIN role (required for manual feed operations)
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

    try {
      await sendAndWaitForCustomSolanaTxSign(provider, grantRoleTx, [], {
        action: 'deployer',
        comment: 'Grant FEED_ADMIN role for manual feed',
        waitForTx: true,
      });
      console.log('✓ FEED_ADMIN role granted');
    } catch (error) {
      // Check if error is "role already exists" - if so, continue
      const errorMsg = error?.toString() || '';
      if (errorMsg.includes('already') || errorMsg.includes('AlreadyGranted')) {
        console.log('ℹ FEED_ADMIN role already exists, continuing');
      } else {
        throw error;
      }
    }

    // Step 2: Deploy manual feed associated with base feed
    const dataFeedProgram = getDataFeedProgram(provider);

    const initialPrice = params.minPrice; // Use minPrice as initial price
    const manualFeedTx = new Transaction().add(
      await dataFeedProgram.methods
        .newManualFeed(toBN(initialPrice), PRICE_DECIMALS)
        .accountsPartial({
          authority: payer.publicKey,
          manualFeed: manualFeedPda,
          acRole: params.acRole,
          authorityAcRole: authorityAcRolePda,
          baseFeed: feedPublicKey,
        })
        .instruction(),
    );

    await sendAndWaitForCustomSolanaTxSign(provider, manualFeedTx, [], {
      action: 'deployer',
      comment: 'Deploy Manual Feed',
      waitForTx: true,
      pollingIntervalMs: 1000,
      timeoutDurationMs: 120 * 1000,
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
