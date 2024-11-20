import { Keypair, PublicKey } from "@solana/web3.js";
import { DataFeedFixtureReturnType } from "../fixture/dafa-feed.fixture";
import {
  fetchDataFeedState,
  fetchManualFeedState,
  generateFeedAcccount,
  getManualFeedStatePda,
} from "../helpers/data-feed.helpers";
import {
  expectTxNotReverted,
  expectTxReverted,
  OptionalCommonParams,
} from "../helpers/common.helpers";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";

type CommonDataFeedParams = DataFeedFixtureReturnType;

export const createNewFeedTester = async ({}: CommonDataFeedParams) => {};

export const createNewFeed = async (
  fixture: CommonDataFeedParams,
  {
    feed,
    authority,
    decimals,
  }: {
    authority?: PublicKey;
    feed?: Keypair;
    decimals?: bigint;
  },
  opt?: OptionalCommonParams
) => {
  const { dataFeedProgram, authority: owner, context } = fixture;

  authority ??= owner.publicKey;
  feed ??= generateFeedAcccount();
  decimals ??= 9n;

  const from = opt?.from ?? owner;

  const tx = await dataFeedProgram.methods
    .newFeed(authority, +decimals.toString())
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
  expect(feedFetched.manualModeEnabled).toBe(false);
  expect(feedFetched.targetDecimals).toBe(9);
};

export const createNewManualFeed = async (
  fixture: CommonDataFeedParams,
  {
    baseFeed,
    decimals,
  }: {
    baseFeed?: PublicKey;
    decimals?: number;
  },
  opt?: OptionalCommonParams
) => {
  const { dataFeedProgram, authority: owner, context, dataFeed } = fixture;

  baseFeed ??= dataFeed.publicKey;
  decimals ??= 9;

  const feedPda = getManualFeedStatePda(baseFeed);

  const from = opt?.from ?? owner;

  const tx = await dataFeedProgram.methods
    .newManualFeed(decimals)
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
