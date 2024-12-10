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
  DataFeedMode,
  generateFeedAcccount,
  getManualFeedStatePda,
} from "../helpers/data-feed.helpers";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { acFixture } from "./ac.fixture";
import {
  acRoleToBuffer,
  getAccountAcRoleStatePda,
} from "../helpers/ac.helpers";
import { DATA_FEED_AC_ROLES } from "../constants/data-feed.constants";
import { AC_ROLES } from "../constants/ac.constants";
import { DataFeed } from "target/types/data_feed";

export const dataFeedFixture = async () => {
  const acF = await acFixture();

  const {
    provider,
    context,
    accounts,
    authority,
    regularAccounts,
    acProgram,
    acRoleGlobal,
    acRoleMTbill,
  } = acF;

  const dataFeedProgram = new Program<DataFeed>(DATA_FEED_IDL as any, provider);

  const dataFeedPaymentToken = generateFeedAcccount();
  const dataFeedMTBill = generateFeedAcccount();

  const manualUnderlyingFeedPaymentToken = getManualFeedStatePda(
    dataFeedPaymentToken.publicKey
  );
  const manualUnderlyingFeedMTBill = getManualFeedStatePda(
    dataFeedMTBill.publicKey
  );

  // TODO: move to helpers
  const createManualFeed = async (
    feed: Keypair,
    acRole: PublicKey,
    {
      minPrice,
      maxPrice,
    }: {
      minPrice: bigint;
      maxPrice: bigint;
    }
  ) => {
    const createFeedTx = new Transaction().add(
      await acProgram.methods
        .grantRole(acRoleToBuffer(DATA_FEED_AC_ROLES.FEED_ADMIN))
        .accountsPartial({
          account: authority.publicKey,
          acRole: acRole,
          authority: authority.publicKey,
          authorityAcAdminRole: getAccountAcRoleStatePda(
            acRole,
            authority.publicKey,
            AC_ROLES.ADMIN
          ),
          accountAcRole: getAccountAcRoleStatePda(
            acRole,
            authority.publicKey,
            DATA_FEED_AC_ROLES.FEED_ADMIN
          ),
        })
        .instruction(),
      await dataFeedProgram.methods
        .newFeed(
          acRole,
          getManualFeedStatePda(feed.publicKey),
          DataFeedMode.manual,
          toBN(minPrice),
          toBN(maxPrice),
          3600
        )
        .accounts({
          feed: feed.publicKey,
          payer: authority.publicKey,
        })
        .instruction(),
      await dataFeedProgram.methods
        .newManualFeed(toBN(parseUnits("1")), 9)
        .accountsPartial({
          baseFeed: feed.publicKey,
          authority: authority.publicKey,
          acRole: acRole,
          authorityAcRole: getAccountAcRoleStatePda(
            acRole,
            authority.publicKey,
            DATA_FEED_AC_ROLES.FEED_ADMIN
          ),
        })
        .instruction()
    );

    await processTransaction(context, createFeedTx, [authority, feed]);
  };

  await createManualFeed(dataFeedMTBill, acRoleMTbill.publicKey, {
    minPrice: parseUnits("0.1"),
    maxPrice: parseUnits("10"),
  });

  await createManualFeed(dataFeedPaymentToken, acRoleGlobal.publicKey, {
    minPrice: parseUnits("0.997"),
    maxPrice: parseUnits("1.05"),
  });

  return {
    ...acF,
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
