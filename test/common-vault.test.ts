import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

import { CommonError, DEFAULT_PUBKEY } from './constants/common.constants';
import { VaultError, VAULTS_SEEDS } from './constants/vaults.constants';
import { vaultsFixture } from './fixture/vaults.fixture';
import { parsePercent, parseUnits } from './helpers/common.helpers';
import { getMinterVaultPda, getRedeemerVaultPda } from './helpers/vaults.helpers';
import {
  addPaymentToken,
  newPauseInx,
  newVaultCommon,
  newVaultCommonAccount,
  removePaymentToken,
  updatePause,
  updatePauseInx,
  updatePaymentToken,
  updateVaultCommon,
  updateVaultCommonAccount,
  withdrawTokens,
} from './testers/common-vaults.testers';
import { mintToken } from './testers/redeem-vault.testers';
import { mintMToken } from './testers/token-authority.testers';

describe('common-vault', () => {
  describe('new_common_vault', () => {
    it('call with default params', async () => {
      const fixture = await vaultsFixture();

      await newVaultCommon(fixture, {});
    });

    it('should fail: when variation_tolerance is 0%', async () => {
      const fixture = await vaultsFixture();

      await newVaultCommon(
        fixture,
        {
          variationTolerance: parsePercent(0),
        },
        {
          revertedWith: VaultError.InvalidFee,
        },
      );
    });

    it('should fail: when variation_tolerance is 101%', async () => {
      const fixture = await vaultsFixture();

      await newVaultCommon(
        fixture,
        {
          variationTolerance: parsePercent(101),
        },
        {
          revertedWith: VaultError.InvalidFee,
        },
      );
    });

    it('should fail: when instant_fee is 101%', async () => {
      const fixture = await vaultsFixture();

      await newVaultCommon(
        fixture,
        {
          variationTolerance: parsePercent(101),
        },
        {
          revertedWith: VaultError.InvalidFee,
        },
      );
    });
  });

  describe('update_common_vault', () => {
    it('call with default params', async () => {
      const fixture = await vaultsFixture();

      const vaultCommon = await newVaultCommon(fixture, {});
      await updateVaultCommon(fixture, { vaultCommon });
    });

    it('should fail: call from non-authority', async () => {
      const fixture = await vaultsFixture();

      const vaultCommon = await newVaultCommon(fixture, {});
      await updateVaultCommon(
        fixture,
        { vaultCommon },
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        },
      );
    });
  });

  describe('new_common_vault_account', () => {
    it('call with default params', async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});

      await newVaultCommonAccount(fixture, {}, { commonVault });
    });

    it('should fail: call when already exist', async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});

      await newVaultCommonAccount(fixture, {}, { commonVault });

      await newVaultCommonAccount(
        fixture,
        {},
        { commonVault },
        {
          revertedWith: CommonError.AccountIsAlreadyInitialized,
        },
      );
    });
  });

  describe('update_common_vault_account', () => {
    it('call with default params', async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await newVaultCommonAccount(fixture, {}, { commonVault });
      await updateVaultCommonAccount(fixture, {}, { commonVault });
    });

    it('update free_from_min_amount value', async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await newVaultCommonAccount(fixture, {}, { commonVault });
      await updateVaultCommonAccount(
        fixture,
        {
          freeFromMinAmount: true,
        },
        { commonVault },
      );
    });

    it('update free_from_min_first_mint value', async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await newVaultCommonAccount(fixture, {}, { commonVault });
      await updateVaultCommonAccount(
        fixture,
        {
          freeFromMinFirstMint: true,
        },
        { commonVault },
      );
    });

    it('update waived_fee value', async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await newVaultCommonAccount(fixture, {}, { commonVault });
      await updateVaultCommonAccount(
        fixture,
        {
          waivedFee: true,
        },
        { commonVault },
      );
    });

    it('should fail: call from non-authority', async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await newVaultCommonAccount(
        fixture,
        {
          account: fixture.regularAccounts[0].publicKey,
        },
        { commonVault },
      );

      await updateVaultCommonAccount(
        fixture,
        {},
        { commonVault },
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        },
      );
    });
  });

  describe('add_payment_token', () => {
    it('call with default params', async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await addPaymentToken(fixture, {}, { commonVault });
    });

    it('should fail: call from non-authority', async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await addPaymentToken(
        fixture,
        {},
        { commonVault },
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        },
      );
    });
  });

  describe('add_payment_token_fiat', () => {
    it('call with default params', async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await addPaymentToken(
        fixture,
        {
          mint: DEFAULT_PUBKEY,
        },
        { commonVault },
      );
    });

    it('should fail: call from non-authority', async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await addPaymentToken(
        fixture,
        {
          mint: DEFAULT_PUBKEY,
        },
        { commonVault },
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        },
      );
    });
  });

  describe('update_payment_token', () => {
    it('call with default params', async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await addPaymentToken(fixture, {}, { commonVault });
      await updatePaymentToken(fixture, {}, { commonVault });
    });

    it('update payment token fiat', async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await addPaymentToken(
        fixture,
        {
          mint: DEFAULT_PUBKEY,
        },
        { commonVault },
      );
      await updatePaymentToken(
        fixture,
        {
          mint: DEFAULT_PUBKEY,
        },
        { commonVault },
      );
    });

    it('should fail: when fee is 101%', async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await addPaymentToken(fixture, {}, { commonVault });
      await updatePaymentToken(
        fixture,
        {
          fee: parsePercent(101),
        },
        { commonVault },
        {
          revertedWith: VaultError.InvalidFee,
        },
      );
    });

    it('should fail: call from non-authority', async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await addPaymentToken(fixture, {}, { commonVault });
      await updatePaymentToken(
        fixture,
        {},
        { commonVault },
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        },
      );
    });
  });

  describe('remove_payment_token', () => {
    it('call with default params', async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await addPaymentToken(fixture, {}, { commonVault });
      await removePaymentToken(fixture, {}, { commonVault });
    });

    it('should fail: call from non-authority', async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await addPaymentToken(fixture, {}, { commonVault });
      await removePaymentToken(
        fixture,
        {},
        { commonVault },
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        },
      );
    });
  });

  describe('update_pause', () => {
    it('call with default params', async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await updatePause(fixture, {}, { commonVault });
    });

    it('should fail: call from non-authority', async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await updatePause(
        fixture,
        {},
        { commonVault },
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        },
      );
    });

    it('should fail: call when the new value is the same as an old one', async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await updatePause(
        fixture,
        { paused: false },
        { commonVault },
        {
          revertedWith: VaultError.ValueDidntChange,
        },
      );
    });
  });

  describe('new_pause_inx', () => {
    it('call with default params', async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await newPauseInx(fixture, {}, { commonVault });
    });

    it('should fail: call from non-authority', async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await newPauseInx(
        fixture,
        {},
        { commonVault },
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        },
      );
    });
  });

  describe('update_pause_inx', () => {
    it('call with default params', async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await newPauseInx(fixture, {}, { commonVault });
      await updatePauseInx(fixture, {}, { commonVault });
    });

    it('should fail: call from non-authority', async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await newPauseInx(fixture, {}, { commonVault });
      await updatePauseInx(
        fixture,
        {},
        { commonVault },
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        },
      );
    });

    it('should fail: call when the new value is the same as an old one', async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await newPauseInx(fixture, {}, { commonVault });
      await updatePauseInx(
        fixture,
        { paused: false },
        { commonVault },
        {
          revertedWith: VaultError.ValueDidntChange,
        },
      );
    });
  });

  describe('withdraw_tokens', () => {
    it('call with default params (token program)', async () => {
      const fixture = await vaultsFixture();

      await mintToken(fixture, {
        to: getMinterVaultPda(fixture.minterCommonVault.publicKey),
      });

      await withdrawTokens(fixture, {});
    });

    it('withdraw m tokens (token 2022 program)', async () => {
      const fixture = await vaultsFixture();

      await mintMToken(fixture, {
        to: getMinterVaultPda(fixture.minterCommonVault.publicKey),
      });

      await withdrawTokens(
        fixture,
        {
          amount: parseUnits('10'),
          mint: fixture.mTBillMint.publicKey,
        },
        {
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        },
      );
    });

    it('withdraw from redeemer vault (token program)', async () => {
      const fixture = await vaultsFixture();

      await mintToken(fixture, {
        to: getRedeemerVaultPda(fixture.redeemerCommonVault.publicKey),
      });

      await withdrawTokens(
        fixture,
        {
          vaultSeed: Buffer.from(VAULTS_SEEDS.REDEEMER_VAULT),
        },
        {
          commonVault: fixture.redeemerCommonVault.publicKey,
        },
      );
    });

    it('withdraw from redeemer vault (token 2022 program)', async () => {
      const fixture = await vaultsFixture();

      await mintMToken(fixture, {
        to: getRedeemerVaultPda(fixture.redeemerCommonVault.publicKey),
      });

      await withdrawTokens(
        fixture,
        {
          amount: parseUnits('10'),
          mint: fixture.mTBillMint.publicKey,
          vaultSeed: Buffer.from(VAULTS_SEEDS.REDEEMER_VAULT),
        },
        {
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          commonVault: fixture.redeemerCommonVault.publicKey,
        },
      );
    });

    it('should fail: call from non-authority', async () => {
      const fixture = await vaultsFixture();

      await mintToken(fixture, {
        to: getMinterVaultPda(fixture.minterCommonVault.publicKey),
      });

      await withdrawTokens(
        fixture,
        {},
        {},
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        },
      );
    });

    it('should fail: when invalid seed provided', async () => {
      const fixture = await vaultsFixture();

      await mintToken(fixture, {
        to: getMinterVaultPda(fixture.minterCommonVault.publicKey),
      });

      await withdrawTokens(
        fixture,
        {
          vaultSeedParam: Buffer.from('some-seed'),
        },
        {},
        {
          revertedWith: VaultError.InvalidSeedProvided,
        },
      );
    });

    it('should fail: when invalid vault provided', async () => {
      const fixture = await vaultsFixture();

      await mintToken(fixture, {
        to: getMinterVaultPda(fixture.minterCommonVault.publicKey),
      });

      await withdrawTokens(
        fixture,
        {
          vaultSeedParam: Buffer.from(VAULTS_SEEDS.REDEEMER_VAULT),
        },
        {},
        {
          revertedWith: VaultError.InvalidVaultProvided,
        },
      );
    });
  });
});
