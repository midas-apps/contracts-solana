import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair, PublicKey, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';

import { createUserError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';
import { DATA_FEED_AC_ROLES } from '@/test/constants/data-feed.constants';
import { getAccountAcRoleStatePda } from '@/test/helpers/ac.helpers';
import { DataFeedMode, fetchDataFeedState } from '@/test/helpers/data-feed.helpers';

import { getDataFeedProgram } from '../../deploy/dataFeed';
import { getTokenAddresses } from '../../utils/addressQueries';
import { getMtoken, getNetwork, getOptionalArg } from '../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Keypair) {
  const mtoken = getMtoken();
  const network = getNetwork();
  const newUnderlyingFeed = getOptionalArg('new-underlying-feed');
  const newMode = getOptionalArg('new-mode') as
    | 'manual'
    | 'switchboard'
    | 'pyth'
    | 'chainlink'
    | undefined;

  const params = [];
  if (newUnderlyingFeed) params.push(`feed: ${newUnderlyingFeed}`);
  if (newMode) params.push(`mode: ${newMode}`);
  const paramStr = params.length > 0 ? ` (${params.join(', ')})` : '';
  console.log(`Updating data feed for ${mtoken}${paramStr}`);

  // Get token addresses
  const tokenAddrs = getTokenAddresses(network, mtoken);
  if (!tokenAddrs?.mTokenDataFeed) {
    throw createUserError(`Data feed not found for ${mtoken} on ${network}`, [
      `Run: yarn deploy:token-datafeed --mtoken ${mtoken} --network ${network}`,
    ]);
  }

  const feedProgram = getDataFeedProgram(provider);
  const state = await fetchDataFeedState(feedProgram, tokenAddrs.mTokenDataFeed);

  // Map mode string to DataFeedMode object
  const modeMap: Record<string, (typeof DataFeedMode)[keyof typeof DataFeedMode]> = {
    manual: DataFeedMode.manual,
    switchboard: DataFeedMode.switchboard,
    pyth: DataFeedMode.pyth,
    chainlink: DataFeedMode.chainlink,
  };

  const newModeEnum = newMode ? modeMap[newMode] : null;
  const newUnderlyingFeedPubkey = newUnderlyingFeed ? new PublicKey(newUnderlyingFeed) : null;

  const tx = new Transaction().add(
    await feedProgram.methods
      .updateFeed(null, newUnderlyingFeedPubkey, newModeEnum, null, null, null)
      .accountsPartial({
        authority: payer.publicKey,
        feed: tokenAddrs.mTokenDataFeed,
        acRole: state.acRole,
        authorityAcRole: getAccountAcRoleStatePda(
          state.acRole,
          payer.publicKey,
          DATA_FEED_AC_ROLES.FEED_ADMIN,
        ),
      })
      .instruction(),
  );

  const txRes = await sendAndConfirmTransaction(provider.connection, tx, [payer], {
    commitment: 'finalized',
  });

  console.log(`✅ Data feed updated successfully!`);
  console.log(`Transaction: ${txRes}`);
}

const network = getNetwork();
executeNetworkScript(network, main);
