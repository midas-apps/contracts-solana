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
  approveMintRequest,
  approveRedeemRequest,
  mintInstant,
  mintMToken,
  mintPaymentToken,
  mintPaymentTokenAndApprove,
  prepareCommonRedeemTest,
  redeemInstant,
  redeemRequest,
  rejectMintRequest,
  rejectRedeemRequest,
} from "./testers/vaults.testers";
import { approveMint } from "./helpers/common.helpers";
import {
  getRedeemerVaultPda,
  getRedeemerVaultRedeemerPda,
} from "./helpers/vaults.helpers";

describe("redeemer-vault", () => {
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
      await mintPaymentTokenAndApprove(fixture, {
        to: getRedeemerVaultPda(fixture.redeemerCommonVault.publicKey),
      });
      await redeemInstant(fixture, {}, {});
    });
  });

  describe("redeem_request", () => {
    it("should redeem request", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);
      await mintMToken(fixture, {});
      await redeemRequest(fixture, {}, {});
    });
  });

  describe("approve_redeem_request", () => {
    it("should approve redeem request", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);
      await mintMToken(fixture, {});
      await mintPaymentToken(fixture, {
        to: getRedeemerVaultRedeemerPda(fixture.redeemerCommonVault.publicKey),
      });
      await redeemRequest(fixture, {}, {});
      await approveRedeemRequest(fixture, {}, {});
    });
  });

  describe("reject_redeem_request", () => {
    it("should reject redeem request", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);
      await mintMToken(fixture, {});
      await redeemRequest(fixture, {}, {});
      await rejectRedeemRequest(fixture, {}, {});
    });
  });
});
