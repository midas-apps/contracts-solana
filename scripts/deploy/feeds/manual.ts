import { Wallet } from '@coral-xyz/anchor';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';

import { createCustomSignerProvider } from '@/common/scriptRunner';
import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';
import { AC_ROLES } from '@/test/constants/ac.constants';
import { DATA_FEED_AC_ROLES } from '@/test/constants/data-feed.constants';
import {
  getAccountAcRoleStatePda,
  acRoleToBuffer,
  fetchAccountAcRoleState,
} from '@/test/helpers/ac.helpers';
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
  initialPrice?: bigint;
  isPaymentToken?: boolean;
  existingDataFeed?: PublicKey;
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
  let { provider, payer } = common;

  // If underlyingFeed is missing, create manual feed
  if (!params.underlyingFeed) {
    // Step 1: Deploy base feed with temporary underlying feed (use manual feed PDA)
    const baseFeedKeypair = Keypair.generate();
    // Calculate the manual feed PDA that will be created later
    // This is safe because PDAs are deterministic
    const manualFeedPda = getManualFeedStatePda(
      params.existingDataFeed ?? baseFeedKeypair.publicKey,
    );

    const tempConfig: DeployDataFeedConfig = {
      acRole: params.acRole,
      mode: 'manual',
      underlyingFeed: manualFeedPda, // Use manual feed PDA (will be created in step 2)
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      maxStaleness: params.maxStaleness,
      feed: baseFeedKeypair,
    };

    const feedPublicKey = params.existingDataFeed
      ? params.existingDataFeed
      : await deployDataFeed(common, tempConfig);

    let action = 'deployer';
    let waitForTx = true;

    // if payment token is true - then acRole is global and should be executed from a different wallet
    if (params.isPaymentToken) {
      const res = await createCustomSignerProvider(common.network, 'update-feed-ptoken');
      provider = res.provider;
      payer = res.payer as Wallet;
      action = 'update-feed-ptoken';
      waitForTx = false;
    }

    // Grant FEED_ADMIN role if not already granted
    const acProgram = getAcProgram(provider);
    const authorityAcRolePda = getAccountAcRoleStatePda(
      params.acRole,
      payer.publicKey,
      DATA_FEED_AC_ROLES.FEED_ADMIN,
    );

    const feeAdminRole = await fetchAccountAcRoleState(acProgram, authorityAcRolePda, true);

    if (!feeAdminRole) {
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
        const roleResult = await sendAndWaitForCustomSolanaTxSign(provider, grantRoleTx, [], {
          action,
          comment: 'Grant FEED_ADMIN role for manual feed',
          waitForTx,
          pollingIntervalMs: waitForTx ? 1000 : undefined,
          timeoutDurationMs: waitForTx ? 120 * 1000 : undefined,
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
    }
    // Step 2: Deploy manual feed associated with base feed
    const dataFeedProgram = getDataFeedProgram(provider);

    if (params.existingDataFeed) {
      console.log(`✓ Using existing data feed: ${params.existingDataFeed.toString()}`);
    }

    const initialPrice = params.initialPrice ?? params.minPrice;
    console.log(`Initial price: ${initialPrice}`);

    const manualFeedTx = new Transaction().add(
      await dataFeedProgram.methods
        .newManualFeed(toBN(initialPrice), 8)
        .accountsPartial({
          authority: payer.publicKey,
          manualFeed: manualFeedPda,
          acRole: params.acRole,
          authorityAcRole: authorityAcRolePda,
          baseFeed: feedPublicKey,
        })
        .instruction(),
    );

    const manualResult = await sendAndWaitForCustomSolanaTxSign(provider, manualFeedTx, [], {
      action,
      comment: 'Deploy Manual Feed',
      waitForTx,
      pollingIntervalMs: waitForTx ? 1000 : undefined,
      timeoutDurationMs: waitForTx ? 120 * 1000 : undefined,
    });

    if (manualResult.signature) {
      console.log(`Transaction signature: ${manualResult.signature}`);
    } else {
      console.log(`Transaction created | TX ID: ${manualResult.txId}`);
    }

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
