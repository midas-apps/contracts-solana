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
import { Transaction } from "@solana/web3.js";

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

  {
    const createFeedTx = new Transaction().add(
      await dataFeedProgram.methods
        .newFeed(
          authority.publicKey,
          getManualFeedStatePda(dataFeedMTBill.publicKey),
          toBN(parseUnits("0.1")),
          toBN(parseUnits("10")),
          3600
        )
        .accounts({
          feed: dataFeedMTBill.publicKey,
          payer: authority.publicKey,
        })
        .instruction(),
      await dataFeedProgram.methods
        .newManualFeed(9)
        .accountsPartial({
          baseFeed: dataFeedMTBill.publicKey,
          authority: authority.publicKey,
        })
        .instruction(),
      await dataFeedProgram.methods
        .setFeedMode({ manual: {} })
        .accountsPartial({
          baseFeed: dataFeedMTBill.publicKey,
          authority: authority.publicKey,
        })
        .instruction(),
      await dataFeedProgram.methods
        .setManualPrice(toBN(parseUnits("1")))
        .accountsPartial({
          baseFeed: dataFeedMTBill.publicKey,
          authority: authority.publicKey,
        })
        .instruction()
    );

    await processTransaction(context, createFeedTx, [
      authority,
      dataFeedMTBill,
    ]);

    console.log("ABOBA");
  }

  {
    const createFeedTx = new Transaction().add(
      await dataFeedProgram.methods
        .newFeed(
          authority.publicKey,
          getManualFeedStatePda(dataFeedPaymentToken.publicKey),
          toBN(parseUnits("0.1")),
          toBN(parseUnits("10")),
          3600
        )
        .accountsPartial({
          feed: dataFeedPaymentToken.publicKey,
          payer: authority.publicKey,
        })
        .instruction(),
      await dataFeedProgram.methods
        .newManualFeed(9)
        .accountsPartial({
          baseFeed: dataFeedPaymentToken.publicKey,
          authority: authority.publicKey,
        })
        .instruction(),
      await dataFeedProgram.methods
        .setFeedMode({ manual: {} })
        .accountsPartial({
          baseFeed: dataFeedPaymentToken.publicKey,
          authority: authority.publicKey,
        })
        .instruction(),
      await dataFeedProgram.methods
        .setManualPrice(toBN(parseUnits("1")))
        .accountsPartial({
          baseFeed: dataFeedPaymentToken.publicKey,
          authority: authority.publicKey,
        })
        .instruction()
    );

    await processTransaction(context, createFeedTx, [
      authority,
      dataFeedPaymentToken,
    ]);
    console.log("ABOBA2");
  }

  // const depositVaultCommon = await vaultsProgram.;

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
  };
};

export type DataFeedFixtureReturnType = Awaited<
  ReturnType<typeof dataFeedFixture>
>;
