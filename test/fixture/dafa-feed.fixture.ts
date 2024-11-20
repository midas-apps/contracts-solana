import {
  createMint,
  initBankrun,
  processTransaction,
  toBN,
} from "../helpers/common.helpers";

import { Program } from "@coral-xyz/anchor";

import * as DATA_FEED_IDL from "../../target/idl/data_feed.json";
import { generateFeedAcccount } from "../helpers/data-feed.helpers";
import { DataFeed } from "@/target/types/data_feed";

export const dataFeedFixture = async () => {
  const { provider, context, accounts } = await initBankrun();
  const [authority, ...regularAccounts] = accounts;

  const dataFeedProgram = new Program<DataFeed>(DATA_FEED_IDL as any, provider);

  const dataFeed = generateFeedAcccount();

  const createFeedTx = await dataFeedProgram.methods
    .newFeed(authority.publicKey, 9)
    .accounts({
      feed: dataFeed.publicKey,
      payer: authority.publicKey,
    })
    .transaction();

  await processTransaction(context, createFeedTx, [authority, dataFeed]);

  return {
    dataFeedProgram,
    dataFeed,
    authority,
    regularAccounts,
    context,
  };
};

export type DataFeedFixtureReturnType = Awaited<
  ReturnType<typeof dataFeedFixture>
>;
