import { vaultsFixture } from "./fixture/vaults.fixture";
import { VAULTS_PROGRAM_ID } from "./constants/vaults.constants";
import {
  approveMintRequest,
  mintInstant,
  mintRequest,
  rejectMintRequest,
} from "./testers/vaults.testers";
import {
  addPaymentToken,
  newVaultCommonAccount,
} from "./testers/common-vaults.testers";
import { newAccountAc } from "./testers/ac.testers";

describe("minter-vault", () => {
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
      await newAccountAc(fixture, {});
      await mintInstant(fixture, {}, {});
    });
  });

  describe("mint_request", () => {
    it("should create mint request", async () => {
      const fixture = await vaultsFixture();

      await addPaymentToken(fixture, {});
      await newVaultCommonAccount(fixture, {});
      await newAccountAc(fixture, {});
      await mintRequest(fixture, {}, {});
    });
  });

  describe("approve_request", () => {
    it("should approve mint request", async () => {
      const fixture = await vaultsFixture();

      await addPaymentToken(fixture, {});
      await newVaultCommonAccount(fixture, {});
      await newAccountAc(fixture, {});
      await mintRequest(fixture, {}, {});

      await approveMintRequest(fixture, {});
    });
  });

  describe("reject_request", () => {
    it("should reject mint request", async () => {
      const fixture = await vaultsFixture();

      await addPaymentToken(fixture, {});
      await newVaultCommonAccount(fixture, {});
      await newAccountAc(fixture, {});
      await mintRequest(fixture, {}, {});

      await rejectMintRequest(fixture, {});
    });
  });
});
