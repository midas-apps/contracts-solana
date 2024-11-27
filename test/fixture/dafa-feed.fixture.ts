import {
  createMint,
  initBankrun,
  parseUnits,
  processTransaction,
  toBN,
} from "../helpers/common.helpers";

import { Program } from "@coral-xyz/anchor";

import * as DATA_FEED_IDL from "../../target/idl/data_feed.json";
import * as MIDAS_VAULTS_IDL from "../../target/idl/midas_vaults.json";
import {
  generateFeedAcccount,
  getManualFeedStatePda,
} from "../helpers/data-feed.helpers";
import { DataFeed } from "@/target/types/data_feed";
import { MidasVaults } from "@/target/types/midas_vaults";
import { Keypair, Transaction } from "@solana/web3.js";

export const dataFeedFixture = async () => {
  const { provider, context, accounts } = await initBankrun();
  const [authority, ...regularAccounts] = accounts;

  const dataFeedProgram = new Program<DataFeed>(DATA_FEED_IDL as any, provider);
  const vaultsProgram = new Program<MidasVaults>(
    MIDAS_VAULTS_IDL as any,
    provider
  );

  const dataFeedPaymentToken = generateFeedAcccount();
  const dataFeedMTBill = generateFeedAcccount();

  const manualUnderlyingFeedPaymentToken = getManualFeedStatePda(
    dataFeedPaymentToken.publicKey
  );
  const manualUnderlyingFeedMTBill = getManualFeedStatePda(
    dataFeedMTBill.publicKey
  );

  // TODO: move to helpers
  const createManualFeed = async (feed: Keypair) => {
    const createFeedTx = new Transaction().add(
      await dataFeedProgram.methods
        .newFeed(
          authority.publicKey,
          getManualFeedStatePda(feed.publicKey),
          toBN(parseUnits("0.1")),
          toBN(parseUnits("10")),
          3600
        )
        .accounts({
          feed: feed.publicKey,
          payer: authority.publicKey,
        })
        .instruction(),
      await dataFeedProgram.methods
        .newManualFeed(9)
        .accountsPartial({
          baseFeed: feed.publicKey,
          authority: authority.publicKey,
        })
        .instruction(),
      await dataFeedProgram.methods
        .setFeedMode({ manual: {} })
        .accountsPartial({
          baseFeed: feed.publicKey,
          authority: authority.publicKey,
        })
        .instruction(),
      await dataFeedProgram.methods
        .setManualPrice(toBN(parseUnits("1")))
        .accountsPartial({
          baseFeed: feed.publicKey,
          authority: authority.publicKey,
        })
        .instruction()
    );

    await processTransaction(context, createFeedTx, [authority, feed]);
  };

  await createManualFeed(dataFeedMTBill);
  await createManualFeed(dataFeedPaymentToken);

  return {
    provider,
    accounts,
    dataFeedProgram,
    dataFeedMTBill,
    dataFeedPaymentToken,
    manualUnderlyingFeedPaymentToken,
    manualUnderlyingFeedMTBill,
    authority,
    regularAccounts,
    context,
    createManualFeed,
  };
};

export type DataFeedFixtureReturnType = Awaited<
  ReturnType<typeof dataFeedFixture>
>;
