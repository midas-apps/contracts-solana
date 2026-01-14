import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { Transaction } from '@solana/web3.js';

import { createUserError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';
import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';
import { DATA_FEED_AC_ROLES } from '@/test/constants/data-feed.constants';
import { getAccountAcRoleStatePda } from '@/test/helpers/ac.helpers';
import { toBN } from '@/test/helpers/common.helpers';
import { fetchDataFeedState, getManualFeedStatePda } from '@/test/helpers/data-feed.helpers';

import { getDataFeedProgram } from '../../deploy/dataFeed';
import { getTokenAddresses } from '../../utils/addressQueries';
import { getMtoken, getNetwork, getOptionalArg } from '../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Wallet) {
  const mtoken = getMtoken();
  const network = getNetwork();
  const priceArg = getOptionalArg('price');
  const decimalsArg = getOptionalArg('decimals');

  if (!priceArg && !decimalsArg) {
    throw createUserError('At least one of --price or --decimals is required', [
      'Example: --price 1.05',
      'Example: --decimals 9',
      'Example: --price 1.05 --decimals 9',
    ]);
  }

  console.log(`\n🔄 Updating manual feed price for ${mtoken} on ${network}`);

  // Get token addresses
  const tokenAddrs = getTokenAddresses(network, mtoken);
  if (!tokenAddrs?.mTokenDataFeed) {
    throw createUserError(`Data feed not found for ${mtoken} on ${network}`, [
      `Run: yarn deploy:token-datafeed --mtoken ${mtoken} --network ${network}`,
    ]);
  }

  const feedProgram = getDataFeedProgram(provider);
  const state = await fetchDataFeedState(feedProgram, tokenAddrs.mTokenDataFeed);

  // Check if feed is manual mode
  if (!('manual' in state.mode)) {
    throw createUserError('This feed is not in manual mode', [
      `Current mode: ${Object.keys(state.mode)[0]}`,
      'Only manual feeds can have their price updated with this script',
    ]);
  }

  // Parse arguments
  const price = priceArg ? parseFloat(priceArg) : null;
  const decimals = decimalsArg ? parseInt(decimalsArg) : null;

  if (price !== null && (isNaN(price) || price < 0)) {
    throw createUserError('Invalid price value', ['Price must be a positive number']);
  }

  if (decimals !== null && (isNaN(decimals) || decimals < 0 || decimals > 18)) {
    throw createUserError('Invalid decimals value', ['Decimals must be between 0 and 18']);
  }

  // Convert price to base-9 format if provided
  const priceBase9 = price !== null ? toBN(BigInt(Math.round(price * 1e9))) : null;

  // Get manual feed PDA
  const manualFeedPda = getManualFeedStatePda(tokenAddrs.mTokenDataFeed);

  console.log('\n📋 Update Details:');
  console.log(`   Data Feed: ${tokenAddrs.mTokenDataFeed.toString()}`);
  console.log(`   Manual Feed PDA: ${manualFeedPda.toString()}`);
  if (price !== null) {
    console.log(`   New Price: $${price} (raw: ${priceBase9?.toString()})`);
  }
  if (decimals !== null) {
    console.log(`   New Decimals: ${decimals}`);
  }

  const tx = new Transaction().add(
    await feedProgram.methods
      .updateManualFeed(priceBase9, decimals)
      .accountsPartial({
        authority: payer.publicKey,
        manualFeed: manualFeedPda,
        baseFeed: tokenAddrs.mTokenDataFeed,
        acRole: state.acRole,
        authorityAcRole: getAccountAcRoleStatePda(
          state.acRole,
          payer.publicKey,
          DATA_FEED_AC_ROLES.FEED_ADMIN,
        ),
      })
      .instruction(),
  );

  const txResult = await sendAndWaitForCustomSolanaTxSign(provider, tx, [], {
    action: 'update-feed-ptoken',
    comment: `Update manual feed price for ${mtoken}`,
    mToken: mtoken,
    waitForTx: false,
  });

  if (txResult.signature) {
    // Local wallet or auto-approved - transaction already mined
    console.log(`\n✅ Manual feed price updated successfully!`);
    console.log(`📝 Transaction: ${txResult.signature}\n`);
  } else {
    // Fordefi multi-sig - transaction pending approval
    console.log(`\n✓ Transaction created | Fordefi TX ID: ${txResult.txId}`);
    console.log(`⏳ Awaiting approval in Fordefi dashboard`);
    console.log(`   This transaction requires multi-sig approval before mining.\n`);
  }
}

const network = getNetwork();
executeNetworkScript(network, main, 'update-feed-ptoken');
