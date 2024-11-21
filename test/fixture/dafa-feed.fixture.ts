import {
  createMint,
  initBankrun,
  parseUnits,
  processTransaction,
  toBN,
} from "../helpers/common.helpers";

import { Program } from "@coral-xyz/anchor";

import * as DATA_FEED_IDL from "../../target/idl/data_feed.json";
import {
  generateFeedAcccount,
  getManualFeedStatePda,
} from "../helpers/data-feed.helpers";
import { DataFeed } from "@/target/types/data_feed";

export const dataFeedFixture = async () => {
  const { provider, context, accounts } = await initBankrun();
  const [authority, ...regularAccounts] = accounts;

  const dataFeedProgram = new Program<DataFeed>(DATA_FEED_IDL as any, provider);

  const dataFeed = generateFeedAcccount();

  const createFeedTx = await dataFeedProgram.methods
    .newFeed(
      authority.publicKey,
      getManualFeedStatePda(dataFeed.publicKey),
      parseUnits("0.1"),
      parseUnits("10"),
      3600
    )
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
