import * as anchor from "@coral-xyz/anchor";
import { dataFeedFixture } from "./fixture/dafa-feed.fixture";
import { DATA_FEED_PROGRAM_ID } from "./constants/data-feed.constants";
import { DataFeedMode, fetchDataFeedState } from "./helpers/data-feed.helpers";
import {
  createNewFeed,
  createNewManualFeed,
} from "./testers/data-feed.testers";
import { vaultsFixture } from "./fixture/vaults.fixture";
import { VaultError, VAULTS_PROGRAM_ID } from "./constants/vaults.constants";
import {
  approveMintRequest,
  mintInstant,
  mintRequest,
  newAcAccount,
  newMintAuthority,
  rejectMintRequest,
} from "./testers/vaults.testers";
import { approveMint, parsePercent } from "./helpers/common.helpers";
import {
  addPaymentToken,
  newVaultCommon,
  newVaultCommonAccount,
  updateVaultCommon,
} from "./testers/common-vaults.testers";

describe("common-vault", () => {
  describe("new_common_vault", () => {
    it("call with default params", async () => {
      const fixture = await vaultsFixture();

      await newVaultCommon(fixture, {});
    });

    it("should fail: when variation_tolerance is 0", async () => {
      const fixture = await vaultsFixture();

      await newVaultCommon(
        fixture,
        {
          variationTolerance: parsePercent(0),
        },
        {
          revertedWith: VaultError.InvalidFee,
        }
      );
    });

    it("should fail: when instant_fee is 101%", async () => {
      const fixture = await vaultsFixture();

      await newVaultCommon(
        fixture,
        {
          variationTolerance: parsePercent(101),
        },
        {
          revertedWith: VaultError.InvalidFee,
        }
      );
    });
  });

  describe("update_common_vault", () => {
    it("call with default params", async () => {
      const fixture = await vaultsFixture();

      const vaultCommon = await newVaultCommon(fixture, {});
      await updateVaultCommon(fixture, { vaultCommon });
    });
  });
});
