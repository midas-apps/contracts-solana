import { CommonError, DEFAULT_PUBKEY } from "./constants/common.constants";
import { acFixture } from "./fixture/ac.fixture";
import {
  burnToken,
  freezeAccount,
  mintMToken,
  newTokenAuthority,
  setAuthority,
  thawAccount,
} from "./testers/token-authority.testers";
import { tokenAuthorityFixture } from "./fixture/token-authority.fixture";
import { vaultsFixture } from "./fixture/vaults.fixture";
import { mintToken } from "./testers/redeem-vault.testers";
import {
  AuthorityType,
  burn,
  createSetAuthorityInstruction,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Keypair,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import { getTokenAuthorityPda } from "./helpers/token-authority.helpers";
import {
  expectNotReverted,
  expectTxNotReverted,
} from "./helpers/common.helpers";

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

  describe("burn", () => {
    it("call with default params", async () => {
      const fixture = await vaultsFixture();

      await mintMToken(fixture, {});

      await expectTxNotReverted(
        fixture.context,
        new Transaction().add(
          createSetAuthorityInstruction(
            fixture.mTBillMint.publicKey,
            fixture.authority.publicKey,
            AuthorityType.PermanentDelegate,
            getTokenAuthorityPda(fixture.mTBillMinterAuthoritySeed),
            undefined,
            TOKEN_2022_PROGRAM_ID
          )
        ),
        [fixture.authority]
      );

      await burnToken(fixture, {}, {});
    });

    it("should fail: call from non-authority", async () => {
      const fixture = await vaultsFixture();

      await burnToken(
        fixture,
        {},
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        }
      );
    });

    it("should fail: call when authority type is not assigned", async () => {
      const fixture = await vaultsFixture();

      await mintMToken(fixture, {});

      await burnToken(
        fixture,
        {},
        {
          revertedWith: CommonError.SplOwnerDoesNotMatch,
        }
      );
    });
  });

  describe("freeze", () => {
    it("call with default params", async () => {
      const fixture = await vaultsFixture();

      await mintMToken(fixture, {});

      await expectTxNotReverted(
        fixture.context,
        new Transaction().add(
          createSetAuthorityInstruction(
            fixture.mTBillMint.publicKey,
            fixture.authority.publicKey,
            AuthorityType.FreezeAccount,
            getTokenAuthorityPda(fixture.mTBillMinterAuthoritySeed),
            undefined,
            TOKEN_2022_PROGRAM_ID
          )
        ),
        [fixture.authority]
      );

      await freezeAccount(fixture, {}, {});
    });

    it("should fail: call from non-authority", async () => {
      const fixture = await vaultsFixture();

      await freezeAccount(
        fixture,
        {},
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        }
      );
    });

    it("should fail: call when authority type is not assigned", async () => {
      const fixture = await vaultsFixture();

      await freezeAccount(
        fixture,
        {},
        {
          revertedWith: CommonError.SplOwnerDoesNotMatch,
        }
      );
    });
  });

  describe("thaw", () => {
    it("call with default params", async () => {
      const fixture = await vaultsFixture();

      await mintMToken(fixture, {});

      await expectTxNotReverted(
        fixture.context,
        new Transaction().add(
          createSetAuthorityInstruction(
            fixture.mTBillMint.publicKey,
            fixture.authority.publicKey,
            AuthorityType.FreezeAccount,
            getTokenAuthorityPda(fixture.mTBillMinterAuthoritySeed),
            undefined,
            TOKEN_2022_PROGRAM_ID
          )
        ),
        [fixture.authority]
      );
      await freezeAccount(fixture, {});
      await thawAccount(fixture, {}, {});
    });

    it("should fail: call from non-authority", async () => {
      const fixture = await vaultsFixture();

      await mintMToken(fixture, {});

      await expectTxNotReverted(
        fixture.context,
        new Transaction().add(
          createSetAuthorityInstruction(
            fixture.mTBillMint.publicKey,
            fixture.authority.publicKey,
            AuthorityType.FreezeAccount,
            getTokenAuthorityPda(fixture.mTBillMinterAuthoritySeed),
            undefined,
            TOKEN_2022_PROGRAM_ID
          )
        ),
        [fixture.authority]
      );

      await thawAccount(
        fixture,
        {},
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        }
      );
    });

    it("should fail: call when authority type is not assigned", async () => {
      const fixture = await vaultsFixture();

      await mintMToken(fixture, {});

      await expectTxNotReverted(
        fixture.context,
        new Transaction().add(
          createSetAuthorityInstruction(
            fixture.mTBillMint.publicKey,
            fixture.authority.publicKey,
            AuthorityType.FreezeAccount,
            getTokenAuthorityPda(fixture.mTBillMinterAuthoritySeed),
            undefined,
            TOKEN_2022_PROGRAM_ID
          )
        ),
        [fixture.authority]
      );

      await freezeAccount(fixture, {});

      await setAuthority(fixture, {
        newAuthority: fixture.regularAccounts[0].publicKey,
        authorityType: AuthorityType.FreezeAccount,
      });

      await thawAccount(
        fixture,
        {},
        {
          revertedWith: CommonError.SplOwnerDoesNotMatch,
        }
      );
    });
  });
});
