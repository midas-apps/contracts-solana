import * as anchor from "@coral-xyz/anchor";
import { dataFeedFixture } from "./fixture/dafa-feed.fixture";
import { DATA_FEED_PROGRAM_ID } from "./constants/data-feed.constants";
import { DataFeedMode, fetchDataFeedState } from "./helpers/data-feed.helpers";
import {
  createNewFeed,
  createNewManualFeed,
} from "./testers/data-feed.testers";
import { vaultsFixture } from "./fixture/vaults.fixture";
import { VAULTS_PROGRAM_ID } from "./constants/vaults.constants";
import {
  addPaymentToken,
  approveMintRequest,
  mintInstant,
  mintMToken,
  mintPaymentToken,
  mintRequest,
  newAcAccount,
  newMintAuthority,
  newVaultCommonAccount,
  prepareCommonRedeemTest,
  redeemInstant,
  rejectMintRequest,
} from "./testers/vaults.testers";
import { approveMint } from "./helpers/common.helpers";
import { getRedeemerVaultPda } from "./helpers/vaults.helpers";

describe.only("redeemer-vault", () => {
  describe("initializing", () => {
    it("Should deploy program", async () => {
      const { vaultsProgram } = await vaultsFixture();
      expect(vaultsProgram.programId.equals(VAULTS_PROGRAM_ID)).toBe(true);
    });
  });

  describe("redeem_instant", () => {
    it("should redeem instant", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);
      await mintMToken(fixture, {});
      await mintPaymentToken(fixture, {
        to: getRedeemerVaultPda(fixture.redeemerCommonVault.publicKey),
      });
      await redeemInstant(fixture, {}, {});
    });
  });
});
