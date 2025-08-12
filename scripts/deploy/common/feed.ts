import { MTokenName } from '@/common/types/tokens';
import { CommonParams, getDataFeedProgram } from './common';
import {
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from '@solana/web3.js';
import {
  DataFeedMode,
  fetchDataFeedState,
} from '@/test/helpers/data-feed.helpers';
import { getAccountAcRoleStatePda } from '@/test/helpers/ac.helpers';
import { DATA_FEED_AC_ROLES } from '@/test/constants/data-feed.constants';
import { getTokenAddresses } from '@/common/addresses';

export type UpdateDataFeedConfig = {
  newUnderlyingFeed: PublicKey | null;
  newMode?: keyof typeof DataFeedMode;
};

export const updateDataFeed = async (
  { provider, payer }: CommonParams,
  mToken: MTokenName,
  { newUnderlyingFeed, newMode }: UpdateDataFeedConfig,
) => {
  const feedProgram = getDataFeedProgram(provider);

  const tokenAddresses = getTokenAddresses(provider.network, mToken);
  const state = await fetchDataFeedState(
    feedProgram,
    tokenAddresses.mTokenDataFeed,
  );

  const tx = new Transaction().add(
    // // TODO: move to role grant
    // await acProgram.methods
    //   .grantRole(acRoleToBuffer(DATA_FEED_AC_ROLES.FEED_ADMIN))
    //   .accountsPartial({
    //     account: payer.publicKey,
    //     acRole: state.acRole,
    //     authority: payer.publicKey,
    //     authorityAcAdminRole: getAccountAcRoleStatePda(
    //       state.acRole,
    //       payer.publicKey,
    //       AC_ROLES.ADMIN
    //     ),
    //     accountAcRole: getAccountAcRoleStatePda(
    //       state.acRole,
    //       payer.publicKey,
    //       DATA_FEED_AC_ROLES.FEED_ADMIN
    //     ),
    //   })
    //   .instruction(),
    await feedProgram.methods
      .updateFeed(
        null,
        newUnderlyingFeed,
        newMode ? DataFeedMode[newMode] : null,
        null,
        null,
        null,
      )
      .accountsPartial({
        authority: payer.publicKey,
        feed: tokenAddresses.mTokenDataFeed,
        acRole: state.acRole,
        authorityAcRole: getAccountAcRoleStatePda(
          state.acRole,
          payer.publicKey,
          DATA_FEED_AC_ROLES.FEED_ADMIN,
        ),
      })
      .instruction(),
  );

  const txRes = await sendAndConfirmTransaction(
    provider.connection,
    tx,
    [payer],
    {
      commitment: 'finalized',
    },
  );

  console.log({ txRes });
};
