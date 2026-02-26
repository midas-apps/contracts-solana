import { Keypair, PublicKey, Transaction } from '@solana/web3.js';

import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';
import { MANUAL_PRICE_DECIMALS } from '@/scripts/constants/pricing';
import { AC_ROLES } from '@/test/constants/ac.constants';
import { DATA_FEED_AC_ROLES } from '@/test/constants/data-feed.constants';
import { getAccountAcRoleStatePda, acRoleToBuffer } from '@/test/helpers/ac.helpers';
import { toBN } from '@/test/helpers/common.helpers';
import {
  getManualFeedGrowthStatePda,
  getManualFeedStatePda,
} from '@/test/helpers/data-feed.helpers';

import { getAcProgram } from '../ac';
import {
  deployDataFeed,
  DeployDataFeedConfig,
  getDataFeedProgram,
  CommonParams,
  DeployDataFeedBaseConfig,
} from '../dataFeed';

export interface DeployManualFeedParams {
  underlyingFeed?: PublicKey; // Optional - if not provided, will create manual feed
  maxAnswerDeviation: bigint;
  initialPrice?: bigint;
}

export interface DeployManualFeedGrowthParams extends DeployManualFeedParams {
  initialPriceTimestamp: number;
  initialGrowthApr: bigint;
  minGrowthApr: bigint;
  maxGrowthApr: bigint;
  onlyUp: boolean;
}
/**
 * Deploy a data feed using manual feed mode
 * If underlyingFeed is not provided, creates a new manual feed
 * Otherwise, uses the provided underlyingFeed address
 */
export async function deployManualFeed(
  common: CommonParams,
  paramsCommon: DeployDataFeedBaseConfig,
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
      acRole: paramsCommon.acRole,
      mode: 'manual',
      underlyingFeed: manualFeedPda, // Use manual feed PDA (will be created in step 2)
      minPrice: paramsCommon.minPrice,
      maxPrice: paramsCommon.maxPrice,
      maxStaleness: paramsCommon.maxStaleness,
      feed: baseFeedKeypair,
    };

    const feedPublicKey = await deployDataFeed(common, tempConfig);

    // Grant FEED_ADMIN role if not already granted
    const acProgram = getAcProgram(provider);
    const authorityAcRolePda = getAccountAcRoleStatePda(
      paramsCommon.acRole,
      payer.publicKey,
      DATA_FEED_AC_ROLES.FEED_ADMIN,
    );

    // Attempt to grant FEED_ADMIN role (required for manual feed operations)
    const grantRoleTx = new Transaction().add(
      await acProgram.methods
        .grantRole(acRoleToBuffer(DATA_FEED_AC_ROLES.FEED_ADMIN))
        .accountsPartial({
          account: payer.publicKey,
          acRole: paramsCommon.acRole,
          authority: payer.publicKey,
          authorityAcAdminRole: getAccountAcRoleStatePda(
            paramsCommon.acRole,
            payer.publicKey,
            AC_ROLES.ADMIN,
          ),
          accountAcRole: authorityAcRolePda,
        })
        .instruction(),
    );

    try {
      const roleResult = await sendAndWaitForCustomSolanaTxSign(provider, grantRoleTx, [], {
        action: 'deployer',
        comment: 'Grant FEED_ADMIN role for manual feed',
        waitForTx: true,
      });
      if (roleResult.signature) {
        console.log(`Transaction signature: ${roleResult.signature}`);
      }
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

    const initialPrice = params.initialPrice ?? paramsCommon.minPrice;
    const manualFeedTx = new Transaction().add(
      await dataFeedProgram.methods
        .newManualFeed(toBN(initialPrice), MANUAL_PRICE_DECIMALS, toBN(params.maxAnswerDeviation))
        .accountsPartial({
          authority: payer.publicKey,
          manualFeed: manualFeedPda,
          acRole: paramsCommon.acRole,
          authorityAcRole: authorityAcRolePda,
          baseFeed: feedPublicKey,
        })
        .instruction(),
    );

    const manualResult = await sendAndWaitForCustomSolanaTxSign(provider, manualFeedTx, [], {
      action: 'deployer',
      comment: 'Deploy Manual Feed',
      waitForTx: true,
      pollingIntervalMs: 1000,
      timeoutDurationMs: 120 * 1000,
    });

    if (manualResult.signature) {
      console.log(`Transaction signature: ${manualResult.signature}`);
    }

    return feedPublicKey;
  }

  // If underlyingFeed is provided, use standard deployment
  const config: DeployDataFeedConfig = {
    ...paramsCommon,
    mode: 'manual',
    underlyingFeed: params.underlyingFeed,
  };

  return await deployDataFeed(common, config);
}

/**
 * Deploy a data feed using manual feed mode
 * If underlyingFeed is not provided, creates a new manual feed
 * Otherwise, uses the provided underlyingFeed address
 */
export async function deployManualFeedGrowth(
  common: CommonParams,
  paramsCommon: DeployDataFeedBaseConfig,
  params: DeployManualFeedGrowthParams,
): Promise<PublicKey> {
  const { provider, payer } = common;

  // If underlyingFeed is missing, create manual feed
  if (!params.underlyingFeed) {
    // Step 1: Deploy base feed with temporary underlying feed (use manual feed PDA)
    const baseFeedKeypair = Keypair.generate();
    // Calculate the manual feed PDA that will be created later
    // This is safe because PDAs are deterministic
    const manualFeedGrowthPda = getManualFeedGrowthStatePda(baseFeedKeypair.publicKey);

    const tempConfig: DeployDataFeedConfig = {
      ...paramsCommon,
      mode: 'manualGrowth',
      feed: baseFeedKeypair,
    };

    const feedPublicKey = await deployDataFeed(common, tempConfig);

    // Grant FEED_ADMIN role if not already granted
    const acProgram = getAcProgram(provider);
    const authorityAcRolePda = getAccountAcRoleStatePda(
      paramsCommon.acRole,
      payer.publicKey,
      DATA_FEED_AC_ROLES.FEED_ADMIN,
    );

    // Attempt to grant FEED_ADMIN role (required for manual feed operations)
    const grantRoleTx = new Transaction().add(
      await acProgram.methods
        .grantRole(acRoleToBuffer(DATA_FEED_AC_ROLES.FEED_ADMIN))
        .accountsPartial({
          account: payer.publicKey,
          acRole: paramsCommon.acRole,
          authority: payer.publicKey,
          authorityAcAdminRole: getAccountAcRoleStatePda(
            paramsCommon.acRole,
            payer.publicKey,
            AC_ROLES.ADMIN,
          ),
          accountAcRole: authorityAcRolePda,
        })
        .instruction(),
    );

    try {
      const roleResult = await sendAndWaitForCustomSolanaTxSign(provider, grantRoleTx, [], {
        action: 'deployer',
        comment: 'Grant FEED_ADMIN role for manual feed',
        waitForTx: true,
      });
      if (roleResult.signature) {
        console.log(`Transaction signature: ${roleResult.signature}`);
      }
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

    const initialPrice = params.initialPrice ?? paramsCommon.minPrice;
    const manualFeedTx = new Transaction().add(
      await dataFeedProgram.methods
        .newManualFeedGrowth(
          toBN(initialPrice),
          params.initialPriceTimestamp,
          toBN(params.initialGrowthApr),
          MANUAL_PRICE_DECIMALS,
          toBN(params.maxAnswerDeviation),
          toBN(params.minGrowthApr),
          toBN(params.maxGrowthApr),
          params.onlyUp,
        )
        .accountsPartial({
          authority: payer.publicKey,
          manualFeedGrowth: manualFeedGrowthPda,
          acRole: paramsCommon.acRole,
          authorityAcRole: authorityAcRolePda,
          baseFeed: feedPublicKey,
        })
        .instruction(),
    );

    const manualResult = await sendAndWaitForCustomSolanaTxSign(provider, manualFeedTx, [], {
      action: 'deployer',
      comment: 'Deploy Manual Feed Growth',
      waitForTx: true,
      pollingIntervalMs: 1000,
      timeoutDurationMs: 120 * 1000,
    });

    if (manualResult.signature) {
      console.log(`Transaction signature: ${manualResult.signature}`);
    }

    return feedPublicKey;
  }

  // If underlyingFeed is provided, use standard deployment
  const config: DeployDataFeedConfig = {
    ...paramsCommon,
    mode: 'manualGrowth',
    underlyingFeed: params.underlyingFeed,
  };

  return await deployDataFeed(common, config);
}
