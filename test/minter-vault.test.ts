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
  mintRequest,
  newAcAccount,
  newMintAuthority,
  newVaultCommonAccount,
  rejectMintRequest,
} from "./testers/vaults.testers";
import { approveMint } from "./helpers/common.helpers";

describe.only("minter-vault", () => {
  describe("initializing", () => {
    it("Should deploy program", async () => {
      const { vaultsProgram } = await vaultsFixture();
      expect(vaultsProgram.programId.equals(VAULTS_PROGRAM_ID)).toBe(true);
    });
  });

  describe("mint_instant", () => {
    it("should mint instant", async () => {
      const fixture = await vaultsFixture();

      await addPaymentToken(fixture, {});
      await newVaultCommonAccount(fixture, {});
      await newAcAccount(fixture, {});
      await mintInstant(fixture, {}, {});
    });
  });

  describe("mint_request", () => {
    it("should create mint request", async () => {
      const fixture = await vaultsFixture();

      await addPaymentToken(fixture, {});
      await newVaultCommonAccount(fixture, {});
      await newAcAccount(fixture, {});
      await mintRequest(fixture, {}, {});
    });
  });

  describe.only("approve_request", () => {
    it("should approve mint request", async () => {
      const fixture = await vaultsFixture();

      await addPaymentToken(fixture, {});
      await newVaultCommonAccount(fixture, {});
      await newAcAccount(fixture, {});
      await mintRequest(fixture, {}, {});

      await approveMintRequest(fixture, {});
    });
  });

  describe.only("reject_request", () => {
    it("should reject mint request", async () => {
      const fixture = await vaultsFixture();

      await addPaymentToken(fixture, {});
      await newVaultCommonAccount(fixture, {});
      await newAcAccount(fixture, {});
      await mintRequest(fixture, {}, {});

      await rejectMintRequest(fixture, {});
    });
  });
});
