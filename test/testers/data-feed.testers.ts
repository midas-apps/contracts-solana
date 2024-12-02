import { Keypair, PublicKey } from "@solana/web3.js";
import { DataFeedFixtureReturnType } from "../fixture/dafa-feed.fixture";
import {
  DataFeedMode,
  fetchDataFeedState,
  fetchManualFeedState,
  generateFeedAcccount,
  getManualFeedStatePda,
} from "../helpers/data-feed.helpers";
import {
  expectEvents,
  expectTxNotReverted,
  expectTxReverted,
  fromBN,
  OptionalCommonParams,
  parseUnits,
  toBN,
  toBNNullable,
} from "../helpers/common.helpers";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";
import { BN, max } from "bn.js";

type CommonDataFeedParams = DataFeedFixtureReturnType;

export const createNewFeedTester = async ({}: CommonDataFeedParams) => {};

export const createNewFeed = async (
  fixture: CommonDataFeedParams,
  {
    feed,
    underlyingFeed,
    mode,
    authority,
    maxPrice,
    maxStaleness,
    minPrice,
  }: {
    authority?: PublicKey;
    feed?: Keypair;
    mode?: keyof typeof DataFeedMode;
    underlyingFeed?: PublicKey;
    minPrice?: bigint;
    maxPrice?: bigint;
    maxStaleness?: number;
  },
  opt?: OptionalCommonParams
) => {
  const { dataFeedProgram, authority: owner, context } = fixture;

  authority ??= owner.publicKey;
  feed ??= generateFeedAcccount();
  minPrice ??= parseUnits("0.1");
  maxPrice ??= parseUnits("10");
  maxStaleness ??= 3600;
  mode ??= "manual";
  underlyingFeed ??= getManualFeedStatePda(feed.publicKey);

  const from = opt?.from ?? owner;

  const tx = await dataFeedProgram.methods
    .newFeed(
      authority,
      underlyingFeed,
      DataFeedMode[mode],
      toBN(minPrice),
      toBN(maxPrice),
      maxStaleness
    )
    .accounts({
      feed: feed.publicKey,
      payer: from.publicKey,
    })
    .transaction();

  if (opt?.revertedWith) {
    await expectTxReverted(context, tx, [from, feed], opt);
    return;
  }

  await expectEvents(
    await expectTxNotReverted(context, tx, [from, feed]),
    dataFeedProgram,
    [
      {
        name: "feedCreatedEvent",
        data: {
          feed: feed.publicKey,
          authority: authority,
          underlyingFeed: underlyingFeed,
          mode: DataFeedMode[mode],
          minPrice: minPrice,
          maxPrice: maxPrice,
          maxStaleness: maxStaleness,
        },
      },
    ]
  );

  const feedFetched = await fetchDataFeedState(dataFeedProgram, feed.publicKey);

  expect(feedFetched.authority.equals(authority)).toBe(true);
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
    authority,
    maxPrice,
    maxStaleness,
    minPrice,
  }: {
    authority?: PublicKey | null;
    feed?: PublicKey | null;
    mode?: keyof typeof DataFeedMode;
    underlyingFeed?: PublicKey | null;
    minPrice?: bigint | null;
    maxPrice?: bigint | null;
    maxStaleness?: number | null;
  },
  opt?: OptionalCommonParams
) => {
  const { dataFeedProgram, authority: owner, context } = fixture;

  authority ??= null;
  feed ??= null;
  minPrice ??= null;
  maxPrice ??= null;
  maxStaleness ??= null;
  mode ??= null;
  underlyingFeed ??= null;

  const from = opt?.from ?? owner;

  console.log({ maxStaleness });
  const tx = await dataFeedProgram.methods
    .updateFeed(
      authority,
      underlyingFeed,
      mode ? DataFeedMode[mode] : null,
      toBNNullable(minPrice),
      toBNNullable(maxPrice),
      maxStaleness
    )
    .accountsPartial({
      feed: feed,
      authority: from.publicKey,
    })
    .transaction();

  if (opt?.revertedWith) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectEvents(
    await expectTxNotReverted(context, tx, [from]),
    dataFeedProgram,
    [
      {
        name: "feedUpdatedEvent",
        data: {
          feed: feed,
          authority: authority,
          underlyingFeed: underlyingFeed,
          mode: DataFeedMode[mode],
          minPrice: minPrice,
          maxPrice: maxPrice,
          maxStaleness: maxStaleness,
        },
      },
    ]
  );

  const feedFetched = await fetchDataFeedState(dataFeedProgram, feed);

  if (authority) {
    expect(feedFetched.authority.equals(authority)).toBe(true);
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
  }: {
    baseFeed?: PublicKey;
    decimals?: number;
    initialPrice?: bigint;
  },
  opt?: OptionalCommonParams
) => {
  const {
    dataFeedProgram,
    authority: owner,
    context,
    dataFeedMTBill,
  } = fixture;

  baseFeed ??= dataFeedMTBill.publicKey;
  decimals ??= 9;
  initialPrice ??= parseUnits("1", decimals);

  const feedPda = getManualFeedStatePda(baseFeed);

  const from = opt?.from ?? owner;

  const tx = await dataFeedProgram.methods
    .newManualFeed(toBN(initialPrice), decimals)
    .accountsStrict({
      baseFeed: baseFeed,
      authority: from.publicKey,
      manualFeed: feedPda,
      systemProgram: SYSTEM_PROGRAM_ID,
    })
    .transaction();

  if (opt?.revertedWith) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectEvents(
    await expectTxNotReverted(context, tx, [from]),
    dataFeedProgram,
    [
      {
        name: "manualFeedCreatedEvent",
        data: {
          baseFeed: baseFeed,
          manualFeed: getManualFeedStatePda(baseFeed),
          decimals,
          initialPrice,
        },
      },
    ]
  );

  const feedFetched = await fetchManualFeedState(dataFeedProgram, feedPda);

  expect(feedFetched.decimals).toBe(decimals);
  expect(fromBN(feedFetched.price)).toBe(initialPrice);
};

export const updateManualFeed = async (
  fixture: CommonDataFeedParams,
  {
    baseFeed,
    decimals,
    price,
  }: {
    baseFeed?: PublicKey;
    decimals?: number;
    price?: bigint;
  },
  opt?: OptionalCommonParams
) => {
  const {
    dataFeedProgram,
    authority: owner,
    context,
    dataFeedMTBill,
  } = fixture;

  baseFeed ??= dataFeedMTBill.publicKey;
  decimals ??= null;
  price ??= null;

  const feedPda = getManualFeedStatePda(baseFeed);

  const from = opt?.from ?? owner;

  const tx = await dataFeedProgram.methods
    .updateManualFeed(price ? toBN(price) : null, decimals)
    .accountsPartial({
      baseFeed: baseFeed,
      authority: from.publicKey,
      manualFeed: feedPda,
    })
    .transaction();

  if (opt?.revertedWith) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectEvents(
    await expectTxNotReverted(context, tx, [from]),
    dataFeedProgram,
    [
      {
        name: "manualFeedUpdatedEvent",
        data: {
          baseFeed: baseFeed,
          manualFeed: getManualFeedStatePda(baseFeed),
          decimals,
          price,
        },
      },
    ]
  );

  const feedFetched = await fetchManualFeedState(dataFeedProgram, feedPda);

  if (decimals) {
    expect(feedFetched.decimals).toBe(decimals);
  }

  if (price) {
    expect(fromBN(feedFetched.price)).toBe(price);
  }
};

export const createDefaultDataFeed = async (fixture: CommonDataFeedParams) => {
  const feed = await createNewFeed(fixture, {});
  await createNewManualFeed(fixture, {
    baseFeed: feed.publicKey,
  });
  return feed.publicKey;
};
