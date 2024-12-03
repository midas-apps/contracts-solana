import * as anchor from "@coral-xyz/anchor";
import { dataFeedFixture } from "./fixture/dafa-feed.fixture";
import { DATA_FEED_PROGRAM_ID } from "./constants/data-feed.constants";
import { DataFeedMode, fetchDataFeedState } from "./helpers/data-feed.helpers";
import {
  createNewFeed,
  createNewManualFeed,
} from "./testers/data-feed.testers";
import { VaultError, VAULTS_PROGRAM_ID } from "./constants/vaults.constants";
import {
  approveMintRequest,
  mintInstant,
  mintRequest,
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
import {
  grantRole,
  newAc,
  newAccountAc,
  newAcRole,
  revokeRole,
  updateAccountAc,
} from "./testers/ac.testers";
import { CommonError } from "./constants/common.constants";
import { acFixture } from "./fixture/ac.fixture";

describe("access-control", () => {
  describe("new_ac_role", () => {
    it("call with default params", async () => {
      const fixture = await acFixture();

      await newAcRole(fixture, {});
    });
  });

  describe("new_ac", () => {
    it("call with default params", async () => {
      const fixture = await acFixture();

      await newAc(fixture, {});
    });
  });

  describe("new_account_ac", () => {
    it("call with default params", async () => {
      const fixture = await acFixture();

      await newAccountAc(fixture, {});
    });
  });

  describe("update_account_ac", () => {
    it("call with default params", async () => {
      const fixture = await acFixture();

      await newAccountAc(fixture, {});
      await updateAccountAc(fixture, {});
    });

    it("update greenlist: false -> true", async () => {
      const fixture = await acFixture();

      await newAccountAc(fixture, {});
      await updateAccountAc(fixture, {
        greenListed: true,
      });
    });

    it("update blacklist: false -> true", async () => {
      const fixture = await acFixture();

      await newAccountAc(fixture, {});
      await updateAccountAc(fixture, {
        blackListed: true,
      });
    });

    // it("should fail: call from non-admin account", async () => {
    //   const fixture = await acFixture();
    //   await newAccountAc(fixture, {});

    //   await updateAccountAc(
    //     fixture,
    //     {},
    //     {
    //       from: fixture.regularAccounts[1],
    //       revertedWith: CommonError.AccountIsNotInitialized,
    //     }
    //   );
    // });
  });

  describe("grant_role", () => {
    it("call with default params", async () => {
      const fixture = await acFixture();

      await grantRole(fixture, {
        account: fixture.regularAccounts[0].publicKey,
      });
    });

    it("should fail: call when already have a role", async () => {
      const fixture = await acFixture();

      await grantRole(fixture, {
        account: fixture.regularAccounts[0].publicKey,
      });

      await grantRole(
        fixture,
        {
          account: fixture.regularAccounts[0].publicKey,
        },
        {
          revertedWith: CommonError.AccountIsAlreadyInitialized,
        }
      );
    });

    it("should fail: call from non-admin account", async () => {
      const fixture = await acFixture();

      await grantRole(
        fixture,
        {
          account: fixture.regularAccounts[0].publicKey,
        },
        {
          from: fixture.regularAccounts[1],
          revertedWith: CommonError.AccountIsNotInitialized,
        }
      );
    });
  });

  describe("revoke_role", () => {
    it("call with default params", async () => {
      const fixture = await acFixture();

      await grantRole(fixture, {
        account: fixture.regularAccounts[0].publicKey,
      });

      await revokeRole(fixture, {
        account: fixture.regularAccounts[0].publicKey,
      });
    });

    it("should fail: call when dont have a role", async () => {
      const fixture = await acFixture();

      await revokeRole(
        fixture,
        {
          account: fixture.regularAccounts[0].publicKey,
        },
        {
          revertedWith: CommonError.AccountIsNotInitialized,
        }
      );
    });

    it("should fail: call from non-admin account", async () => {
      const fixture = await acFixture();

      await revokeRole(
        fixture,
        {
          account: fixture.authority.publicKey,
        },
        {
          from: fixture.regularAccounts[1],
          revertedWith: CommonError.AccountIsNotInitialized,
        }
      );
    });
  });
});
