import { Keypair, PublicKey } from '@solana/web3.js';

import { DATA_FEED_AC_ROLES } from '../constants/data-feed.constants';
import { DataFeedFixtureReturnType } from '../fixture/dafa-feed.fixture';
import { getAccountAcRoleStatePda } from '../helpers/ac.helpers';
import {
  expectEvents,
  expectTxNotReverted,
  expectTxReverted,
  fromBN,
  getTime,
  OptionalCommonParams,
  parseUnits,
  toBN,
  toBNNullable,
} from '../helpers/common.helpers';
import {
  DataFeedMode,
  fetchDataFeedState,
  fetchManualFeedState,
  generateFeedAcccount,
  getManualFeedStatePda,
} from '../helpers/data-feed.helpers';

type CommonDataFeedParams = DataFeedFixtureReturnType;

export const createNewFeed = async (
  fixture: CommonDataFeedParams,
  {
    feed,
    underlyingFeed,
    mode,
    acRole,
    maxPrice,
    maxStaleness,
    minPrice,
  }: {
    acRole?: PublicKey;
    feed?: Keypair;
    mode?: keyof typeof DataFeedMode;
    underlyingFeed?: PublicKey;
    minPrice?: bigint;
    maxPrice?: bigint;
    maxStaleness?: number;
  },
  opt?: OptionalCommonParams,
) => {
  const { dataFeedProgram, acRoleGlobal, authority: owner, context } = fixture;

  acRole ??= acRoleGlobal.publicKey;
  feed ??= generateFeedAcccount();
  minPrice ??= parseUnits('0.1');
  maxPrice ??= parseUnits('10');
  mode ??= 'manual';
  maxStaleness ??= mode === 'manual' ? 3600 : 60;
  underlyingFeed ??= getManualFeedStatePda(feed.publicKey);

  const from = opt?.from ?? owner;

  const tx = await dataFeedProgram.methods
    .newFeed(
      acRole,
      underlyingFeed,
      DataFeedMode[mode],
      toBN(minPrice),
      toBN(maxPrice),
      maxStaleness,
    )
    .accounts({
      feed: feed.publicKey,
      payer: from.publicKey,
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from, feed], opt);
    return;
  }

  await expectEvents(await expectTxNotReverted(context, tx, [from, feed]), dataFeedProgram, [
    {
      name: 'feedUpdatedEvent',
      data: {
        feed: feed.publicKey,
        acRole: acRole,
        underlyingFeed: underlyingFeed,
        mode: DataFeedMode[mode],
        minPrice: minPrice,
        maxPrice: maxPrice,
        maxStaleness: maxStaleness,
      },
    },
  ]);

  const feedFetched = await fetchDataFeedState(dataFeedProgram, feed.publicKey);

  expect(feedFetched.acRole.equals(acRole)).toBe(true);
  expect(feedFetched.underlyingFeed.equals(underlyingFeed)).toBe(true);
  expect(fromBN(feedFetched.minPrice)).toBe(minPrice);
  expect(fromBN(feedFetched.maxPrice)).toBe(maxPrice);
  expect(feedFetched.maxStaleness).toBe(maxStaleness);
  expect(feedFetched.mode).toMatchObject(DataFeedMode[mode]);

  return feed;
};

export const updateFeed = async (
  fixture: CommonDataFeedParams,
  {
    feed,
    underlyingFeed,
    mode,
    acRole,
    maxPrice,
    maxStaleness,
    minPrice,
  }: {
    acRole?: PublicKey | null;
    feed?: PublicKey | null;
    mode?: keyof typeof DataFeedMode;
    underlyingFeed?: PublicKey | null;
    minPrice?: bigint | null;
    maxPrice?: bigint | null;
    maxStaleness?: number | null;
  },
  opt?: OptionalCommonParams,
) => {
  const { dataFeedProgram, authority: owner, context } = fixture;

  acRole ??= null;
  feed ??= fixture.dataFeedMTBill.publicKey;
  minPrice ??= null;
  maxPrice ??= null;
  maxStaleness ??= null;
  mode ??= null;
  underlyingFeed ??= null;

  const from = opt?.from ?? owner;

  const baseFeedStateBefore = await fetchDataFeedState(dataFeedProgram, feed);

  const tx = await dataFeedProgram.methods
    .updateFeed(
      acRole,
      underlyingFeed,
      mode ? DataFeedMode[mode] : null,
      toBNNullable(minPrice),
      toBNNullable(maxPrice),
      maxStaleness,
    )
    .accountsPartial({
      feed: feed,
      authority: from.publicKey,
      acRole: baseFeedStateBefore.acRole,
      authorityAcRole: getAccountAcRoleStatePda(
        baseFeedStateBefore.acRole,
        from.publicKey,
        DATA_FEED_AC_ROLES.FEED_ADMIN,
      ),
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectEvents(await expectTxNotReverted(context, tx, [from]), dataFeedProgram, [
    {
      name: 'feedUpdatedEvent',
      data: {
        feed: feed,
        acRole: acRole,
        underlyingFeed: underlyingFeed,
        mode: DataFeedMode[mode],
        minPrice: minPrice,
        maxPrice: maxPrice,
        maxStaleness: maxStaleness,
      },
    },
  ]);

  const feedFetched = await fetchDataFeedState(dataFeedProgram, feed);

  if (acRole) {
    expect(feedFetched.acRole.equals(acRole)).toBe(true);
  }

  if (underlyingFeed) {
    expect(feedFetched.underlyingFeed.equals(underlyingFeed)).toBe(true);
  }

  if (minPrice) {
    expect(fromBN(feedFetched.minPrice)).toBe(minPrice);
  }

  if (maxPrice) {
    expect(fromBN(feedFetched.maxPrice)).toBe(maxPrice);
  }

  if (maxStaleness) {
    expect(feedFetched.maxStaleness).toBe(maxStaleness);
  }

  if (mode) {
    expect(feedFetched.mode).toMatchObject(DataFeedMode[mode]);
  }

  return feed;
};

export const createNewManualFeed = async (
  fixture: CommonDataFeedParams,
  {
    baseFeed,
    decimals,
    initialPrice,
    maxAnswerDeviation,
  }: {
    baseFeed?: PublicKey;
    decimals?: number;
    initialPrice?: bigint;
    maxAnswerDeviation?: bigint;
  },
  opt?: OptionalCommonParams,
) => {
  const { dataFeedProgram, authority: owner, context, dataFeedMTBill } = fixture;

  baseFeed ??= dataFeedMTBill.publicKey;
  decimals ??= 9;
  initialPrice ??= parseUnits('1', decimals);
  maxAnswerDeviation ??= parseUnits('1', 2);

  const feedPda = getManualFeedStatePda(baseFeed);

  const from = opt?.from ?? owner;
  const baseFeedState = await fetchDataFeedState(dataFeedProgram, baseFeed);

  const tx = await dataFeedProgram.methods
    .newManualFeed(toBN(initialPrice), decimals, toBN(maxAnswerDeviation))
    .accountsPartial({
      baseFeed: baseFeed,
      authority: from.publicKey,
      manualFeed: feedPda,
      acRole: baseFeedState.acRole,
      authorityAcRole: getAccountAcRoleStatePda(
        baseFeedState.acRole,
        from.publicKey,
        DATA_FEED_AC_ROLES.FEED_ADMIN,
      ),
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectEvents(await expectTxNotReverted(context, tx, [from]), dataFeedProgram, [
    {
      name: 'manualFeedUpdatedEventV2',
      data: {
        baseFeed: baseFeed,
        manualFeed: getManualFeedStatePda(baseFeed),
        decimals,
        price: initialPrice,
      },
    },
  ]);

  const feedFetched = await fetchManualFeedState(dataFeedProgram, feedPda);

  expect(feedFetched.decimals).toBe(decimals);
  expect(fromBN(feedFetched.price)).toBe(initialPrice);
};

export const updateManualFeed = async (
  fixture: CommonDataFeedParams,
  {
    baseFeed,
    decimals,
    maxAnswerDeviation
  }: {
    baseFeed?: PublicKey;
    decimals?: number;
    maxAnswerDeviation?: bigint;
  },
  opt?: OptionalCommonParams,
) => {
  const { dataFeedProgram, authority: owner, context, dataFeedMTBill } = fixture;

  baseFeed ??= dataFeedMTBill.publicKey;
  decimals ??= null;
  maxAnswerDeviation ??= null;

  const feedPda = getManualFeedStatePda(baseFeed);

  const from = opt?.from ?? owner;
  const baseFeedStateBefore = await fetchDataFeedState(dataFeedProgram, baseFeed);

  const tx = await dataFeedProgram.methods
    .updateManualFeed(decimals, toBNNullable(maxAnswerDeviation))
    .accountsPartial({
      baseFeed: baseFeed,
      authority: from.publicKey,
      manualFeed: feedPda,
      acRole: baseFeedStateBefore.acRole,
      authorityAcRole: getAccountAcRoleStatePda(
        baseFeedStateBefore.acRole,
        from.publicKey,
        DATA_FEED_AC_ROLES.FEED_ADMIN,
      ),
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectEvents(await expectTxNotReverted(context, tx, [from]), dataFeedProgram, [
    {
      name: 'manualFeedUpdatedEventV2',
      data: {
        baseFeed: baseFeed,
        manualFeed: getManualFeedStatePda(baseFeed),
        decimals,
        maxAnswerDeviation,
      },
    },
  ]);

  const feedFetched = await fetchManualFeedState(dataFeedProgram, feedPda);

  if (decimals !== null) {
    expect(feedFetched.decimals).toBe(decimals);
  }

  if (maxAnswerDeviation !== null) {
    expect(fromBN(feedFetched.maxAnswerDeviation)).toBe(maxAnswerDeviation);
  }

  if (decimals !== null) {
    const currentTs = await getTime(fixture.context);
    expect(BigInt(feedFetched.lastUpdatedAt)).toBe(currentTs);
  }
};

export const updateManualFeedPrice = async (
  fixture: CommonDataFeedParams,
  {
    baseFeed,
    price,
    isSafe,
  }: {
    baseFeed?: PublicKey;
    price: bigint;
    isSafe?: boolean;
  },
  opt?: OptionalCommonParams,
) => {
  const { dataFeedProgram, authority: owner, context, dataFeedMTBill } = fixture;

  baseFeed ??= dataFeedMTBill.publicKey;
  isSafe ??= false;

  const feedPda = getManualFeedStatePda(baseFeed);

  const from = opt?.from ?? owner;
  const baseFeedStateBefore = await fetchDataFeedState(dataFeedProgram, baseFeed);

  const tx = await dataFeedProgram.methods
    .updateManualFeedPrice(toBN(price), isSafe)
    .accountsPartial({
      baseFeed: baseFeed,
      authority: from.publicKey,
      manualFeed: feedPda,
      acRole: baseFeedStateBefore.acRole,
      authorityAcRole: getAccountAcRoleStatePda(
        baseFeedStateBefore.acRole,
        from.publicKey,
        DATA_FEED_AC_ROLES.FEED_ADMIN,
      ),
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectEvents(await expectTxNotReverted(context, tx, [from]), dataFeedProgram, [
    {
      name: 'manualFeedUpdatedEventV2',
      data: {
        baseFeed: baseFeed,
        manualFeed: getManualFeedStatePda(baseFeed),
        decimals: null,
        maxAnswerDeviation: null,
        price
      },
    },
  ]);

  const feedFetched = await fetchManualFeedState(dataFeedProgram, feedPda);

  expect(fromBN(feedFetched.price)).toBe(price);

  const currentTs = await getTime(fixture.context);
  expect(BigInt(feedFetched.lastUpdatedAt)).toBe(currentTs);
};


export const createDefaultDataFeed = async (fixture: CommonDataFeedParams) => {
  const feed = await createNewFeed(fixture, {});
  await createNewManualFeed(fixture, {
    baseFeed: feed.publicKey,
  });
  return feed.publicKey;
};
