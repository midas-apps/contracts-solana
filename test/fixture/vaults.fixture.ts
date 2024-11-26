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
import { dataFeedFixture } from "./dafa-feed.fixture";

export const vaultsFixture = async () => {
  const dfFixture = await dataFeedFixture();

  const {
    accounts,
    authority,
    context,
    dataFeedMTBill,
    dataFeedPaymentToken,
    dataFeedProgram,
    manualUnderlyingFeedMTBill,
    manualUnderlyingFeedPaymentToken,
    provider,
    regularAccounts,
  } = dfFixture;

  const vaultsProgram = new Program<MidasVaults>(
    MIDAS_VAULTS_IDL as any,
    provider
  );

  const ac = generateFeedAcccount;

  return {
    ...dfFixture,
    vaultsProgram,
  };
};

export type DataFeedFixtureReturnType = Awaited<
  ReturnType<typeof dataFeedFixture>
>;
