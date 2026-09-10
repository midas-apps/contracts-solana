import {
  AuthorityType,
  createFreezeAccountInstruction,
  createSetAuthorityInstruction,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import { Transaction } from '@solana/web3.js';

import { CommonError } from './constants/common.constants';
import { acFixture } from './fixture/ac.fixture';
import { tokenAuthorityFixture } from './fixture/token-authority.fixture';
import { vaultsFixture } from './fixture/vaults.fixture';
import {
  createStandaloneTokenAccount,
  expectTxNotReverted,
  findATA,
} from './helpers/common.helpers';
import { getTokenAuthorityPda } from './helpers/token-authority.helpers';
import {
  burnToken,
  freezeAccount,
  mintMToken,
  newTokenAuthority,
  thawAccount,
} from './testers/token-authority.testers';

describe('token-authority', () => {
  describe('new_token_authority', () => {
    it('call with default params', async () => {
      const fixture = await tokenAuthorityFixture(await acFixture());

      await newTokenAuthority(fixture, {
        seed: 'test-seed',
      });
    });
  });

  describe('mint', () => {
    it('call with default params', async () => {
      const fixture = await vaultsFixture();

      await mintMToken(fixture, {});
    });

    it('should fail: call from non-authority', async () => {
      const fixture = await vaultsFixture();

      await mintMToken(
        fixture,
        {},
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        },
      );
    });

    it('mints to a non-canonical token account', async () => {
      const fixture = await vaultsFixture();
      const owner = fixture.regularAccounts[0].publicKey;
      const tokenAccount = await createStandaloneTokenAccount(
        fixture.context,
        fixture.provider.connection,
        fixture.mTBillMint.publicKey,
        owner,
        fixture.authority,
        TOKEN_2022_PROGRAM_ID,
      );

      expect(
        tokenAccount.equals(findATA(fixture.mTBillMint.publicKey, owner, TOKEN_2022_PROGRAM_ID)),
      ).toBe(false);

      await mintMToken(fixture, {
        to: owner,
        tokenAccount,
        amount: 100n,
      });
    });
  });

  describe('burn', () => {
    it('call with default params', async () => {
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
            TOKEN_2022_PROGRAM_ID,
          ),
        ),
        [fixture.authority],
      );

      await burnToken(fixture, {}, {});
    });

    it('call when the `from` is a different from the `authority`', async () => {
      const fixture = await vaultsFixture();

      const burnFrom = fixture.accounts[1].publicKey;

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
            TOKEN_2022_PROGRAM_ID,
          ),
        ),
        [fixture.authority],
      );

      expect(burnFrom).not.toEqual(fixture.authority.publicKey);

      await mintMToken(fixture, {
        to: burnFrom,
        amount: 100n,
      });

      await burnToken(fixture, { address: burnFrom, amount: 100n }, {});
    });

    it('burns from a non-canonical token account', async () => {
      const fixture = await vaultsFixture();
      const owner = fixture.accounts[1].publicKey;
      const tokenAccount = await createStandaloneTokenAccount(
        fixture.context,
        fixture.provider.connection,
        fixture.mTBillMint.publicKey,
        owner,
        fixture.authority,
        TOKEN_2022_PROGRAM_ID,
      );

      expect(
        tokenAccount.equals(findATA(fixture.mTBillMint.publicKey, owner, TOKEN_2022_PROGRAM_ID)),
      ).toBe(false);

      await expectTxNotReverted(
        fixture.context,
        new Transaction().add(
          createSetAuthorityInstruction(
            fixture.mTBillMint.publicKey,
            fixture.authority.publicKey,
            AuthorityType.PermanentDelegate,
            getTokenAuthorityPda(fixture.mTBillMinterAuthoritySeed),
            undefined,
            TOKEN_2022_PROGRAM_ID,
          ),
        ),
        [fixture.authority],
      );

      await mintMToken(fixture, {
        to: owner,
        tokenAccount,
        amount: 100n,
      });

      await burnToken(fixture, { tokenAccount, amount: 100n }, {});
    });

    it('should fail: call from non-authority', async () => {
      const fixture = await vaultsFixture();

      await burnToken(
        fixture,
        {},
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        },
      );
    });

    it('should fail: call when authority type is not assigned', async () => {
      const fixture = await vaultsFixture();

      await mintMToken(fixture, {});

      await burnToken(
        fixture,
        {},
        {
          revertedWith: CommonError.SplOwnerDoesNotMatch,
        },
      );
    });
  });

  describe('freeze', () => {
    it('call with default params', async () => {
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
            TOKEN_2022_PROGRAM_ID,
          ),
        ),
        [fixture.authority],
      );

      await freezeAccount(fixture, {}, {});
    });

    it('freezes a non-canonical token account', async () => {
      const fixture = await vaultsFixture();
      const owner = fixture.regularAccounts[0].publicKey;
      const tokenAccount = await createStandaloneTokenAccount(
        fixture.context,
        fixture.provider.connection,
        fixture.mTBillMint.publicKey,
        owner,
        fixture.authority,
        TOKEN_2022_PROGRAM_ID,
      );

      expect(
        tokenAccount.equals(findATA(fixture.mTBillMint.publicKey, owner, TOKEN_2022_PROGRAM_ID)),
      ).toBe(false);

      await mintMToken(fixture, {
        to: owner,
        tokenAccount,
        amount: 100n,
      });

      await expectTxNotReverted(
        fixture.context,
        new Transaction().add(
          createSetAuthorityInstruction(
            fixture.mTBillMint.publicKey,
            fixture.authority.publicKey,
            AuthorityType.FreezeAccount,
            getTokenAuthorityPda(fixture.mTBillMinterAuthoritySeed),
            undefined,
            TOKEN_2022_PROGRAM_ID,
          ),
        ),
        [fixture.authority],
      );

      await freezeAccount(fixture, { tokenAccount }, {});
    });

    it('should fail: call from non-authority', async () => {
      const fixture = await vaultsFixture();

      await freezeAccount(
        fixture,
        {},
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        },
      );
    });

    it('should fail: call when authority type is not assigned', async () => {
      const fixture = await vaultsFixture();

      await freezeAccount(
        fixture,
        {},
        {
          revertedWith: CommonError.SplOwnerDoesNotMatch,
        },
      );
    });
  });

  describe('thaw', () => {
    it('call with default params', async () => {
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
            TOKEN_2022_PROGRAM_ID,
          ),
        ),
        [fixture.authority],
      );
      await freezeAccount(fixture, {});
      await thawAccount(fixture, {}, {});
    });

    it('thaws a non-canonical token account', async () => {
      const fixture = await vaultsFixture();
      const owner = fixture.regularAccounts[0].publicKey;
      const tokenAccount = await createStandaloneTokenAccount(
        fixture.context,
        fixture.provider.connection,
        fixture.mTBillMint.publicKey,
        owner,
        fixture.authority,
        TOKEN_2022_PROGRAM_ID,
      );

      expect(
        tokenAccount.equals(findATA(fixture.mTBillMint.publicKey, owner, TOKEN_2022_PROGRAM_ID)),
      ).toBe(false);

      await mintMToken(fixture, {
        to: owner,
        tokenAccount,
        amount: 100n,
      });

      await expectTxNotReverted(
        fixture.context,
        new Transaction().add(
          createSetAuthorityInstruction(
            fixture.mTBillMint.publicKey,
            fixture.authority.publicKey,
            AuthorityType.FreezeAccount,
            getTokenAuthorityPda(fixture.mTBillMinterAuthoritySeed),
            undefined,
            TOKEN_2022_PROGRAM_ID,
          ),
        ),
        [fixture.authority],
      );

      await freezeAccount(fixture, { tokenAccount });
      await thawAccount(fixture, { tokenAccount }, {});
    });

    it('should fail: call from non-authority', async () => {
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
            TOKEN_2022_PROGRAM_ID,
          ),
        ),
        [fixture.authority],
      );

      await thawAccount(
        fixture,
        {},
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        },
      );
    });
  });
});
