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
  expectTxNotReverted,
  expectTxReverted,
  OptionalCommonParams,
  parseUnits,
  toBN,
} from "../helpers/common.helpers";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";

type CommonDataFeedParams = DataFeedFixtureReturnType;

export const createNewFeedTester = async ({}: CommonDataFeedParams) => {};

export const createNewFeed = async (
  fixture: CommonDataFeedParams,
  {
    feed,
    underlyingFeed,
    authority,
    maxPrice,
    maxStaleness,
    minPrice,
  }: {
    authority?: PublicKey;
    feed?: Keypair;
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

  const from = opt?.from ?? owner;

  const tx = await dataFeedProgram.methods
    .newFeed(
      authority,
      underlyingFeed,
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

  await expectTxNotReverted(context, tx, [from, feed]);

  const feedFetched = await fetchDataFeedState(dataFeedProgram, feed.publicKey);

  expect(feedFetched.authority.equals(authority)).toBe(true);
  expect(feedFetched.mode).toMatchObject(DataFeedMode.manual);

  return feed;
};

export const createNewManualFeed = async (
  fixture: CommonDataFeedParams,
  {
    baseFeed,
    decimals,
    initPrice,
  }: {
    baseFeed?: PublicKey;
    decimals?: number;
    initPrice?: bigint;
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
  initPrice ??= parseUnits("1", decimals);

  const feedPda = getManualFeedStatePda(baseFeed);

  const from = opt?.from ?? owner;

  const tx = await dataFeedProgram.methods
    .newManualFeed(toBN(initPrice), decimals)
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

  await expectTxNotReverted(context, tx, [from]);

  const feedFetched = await fetchManualFeedState(dataFeedProgram, feedPda);

  expect(feedFetched.decimals).toBe(decimals);
};
