import { CommonError, DEFAULT_PUBKEY } from "./constants/common.constants";
import { acFixture } from "./fixture/ac.fixture";
import {
  mintMToken,
  newTokenAuthority,
  setAuthority,
} from "./testers/token-authority.testers";
import { tokenAuthorityFixture } from "./fixture/token-authority.fixture";
import { vaultsFixture } from "./fixture/vaults.fixture";
import { mintToken } from "./testers/redeem-vault.testers";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { Keypair } from "@solana/web3.js";

describe("token-authority", () => {
  describe("new_token_authority", () => {
    it("call with default params", async () => {
      const fixture = await tokenAuthorityFixture(await acFixture());

      await newTokenAuthority(fixture, {
        seed: "test-seed",
      });
    });
  });

  describe("mint", () => {
    it("call with default params", async () => {
      const fixture = await vaultsFixture();

      await mintMToken(fixture, {});
    });

    it("should fail: call from non-authority", async () => {
      const fixture = await vaultsFixture();

      await mintMToken(
        fixture,
        {},
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        }
      );
    });
  });

  describe("set_authority", () => {
    it("call with default params", async () => {
      const fixture = await vaultsFixture();

      await setAuthority(fixture, {
        newAuthority: fixture.regularAccounts[0].publicKey,
      });
      await mintToken(
        fixture,
        {
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          mint: {
            mint: fixture.mTBillMint.publicKey,
            decimals: 9,
            feed: Keypair.generate(),
          },
        },
        {
          from: fixture.regularAccounts[0],
        }
      );
    });

    it("should fail: call from non-authority", async () => {
      const fixture = await vaultsFixture();

      await mintMToken(
        fixture,
        {},
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        }
      );
    });
  });
});
