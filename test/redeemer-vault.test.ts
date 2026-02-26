import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Keypair, Transaction } from '@solana/web3.js';

import { CommonError, DAY, DEFAULT_PUBKEY } from './constants/common.constants';
import { DataFeedError } from './constants/data-feed.constants';
import {
  VAULT_AC_ROLES,
  VaultActionIds,
  VaultError,
  VAULTS_PROGRAM_ID,
} from './constants/vaults.constants';
import { vaultsFixture } from './fixture/vaults.fixture';
import { getAccountAcRoleStatePda } from './helpers/ac.helpers';
import {
  expectTxNotReverted,
  fromBN,
  getBalance,
  getOrCreateAta,
  parsePercent,
  parseUnits,
  timeTravel,
  toBN,
} from './helpers/common.helpers';
import { fetchDataFeedState } from './helpers/data-feed.helpers';
import {
  fetchRedeemerVaultRequestState,
  fetchRedeemerVaultState,
  fetchVaultCommonState,
  getRedeemerVaultPda,
  getRedeemerVaultRequestPda,
} from './helpers/vaults.helpers';
import { newAccountAc, updateAccountAc } from './testers/ac.testers';
import {
  addPaymentToken,
  newVaultCommon,
  newVaultCommonAccount,
  updatePause,
  updatePauseInx,
  updateVaultCommon,
  updateVaultCommonAccount,
} from './testers/common-vaults.testers';
import { updateFeed, updateManualFeedPrice } from './testers/data-feed.testers';
import {
  approveRedeemRequest,
  mintPaymentTokenAndApprove,
  prepareCommonRedeemTest,
  redeemInstant,
  redeemRequest,
  rejectRedeemRequest,
  newRedeemerVault,
  safeApproveRedeemRequestAtCurrentRate,
  safeApproveRedeemRequestAtRequestRate,
  updateRedeemerVault,
  transferToken,
} from './testers/redeem-vault.testers';
import { mintMToken } from './testers/token-authority.testers';

describe('redeemer-vault', () => {
  describe('initializing', () => {
    it('Should deploy program', async () => {
      const { vaultsProgram } = await vaultsFixture();
      expect(vaultsProgram.programId.equals(VAULTS_PROGRAM_ID)).toBe(true);
    });
  });

  describe('new_redeemer_vault', () => {
    it('call with default params', async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await newRedeemerVault(fixture, { commonVault });
    });

    it('should fail: call from non-authority', async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await newRedeemerVault(
        fixture,
        { commonVault },
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        },
      );
    });
  });

  describe('update_redeemer_vault', () => {
    it('call with default params', async () => {
      const fixture = await vaultsFixture();

      await updateRedeemerVault(fixture, {});
    });

    it('should fail; call from non-authority', async () => {
      const fixture = await vaultsFixture();

      await updateRedeemerVault(
        fixture,
        {},
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        },
      );
    });
  });

  describe('redeem_instant', () => {
    it('should redeem instant', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);
      await redeemInstant(fixture, {}, {});
    });

    it('when green list enabled and user is in green list', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);

      await updateVaultCommon(fixture, {
        greenlistEnforced: true,
      });

      await updateAccountAc(fixture, {
        greenListed: true,
      });

      await redeemInstant(fixture, {});
    });

    it('when user is waived from fee', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);

      await updateVaultCommonAccount(
        fixture,
        {
          waivedFee: true,
        },
        {
          commonVault: fixture.redeemerCommonVault.publicKey,
        },
      );

      await redeemInstant(
        fixture,
        {},
        {},
        {
          fee: 0n,
          tokensReceived: 10,
        },
      );
    });

    it('when allowance is set to u128.max - it should not decrease', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);

      await redeemInstant(fixture, {});
    });

    it('when allowance is not set to u128.max - it should  decrease', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        addPaymentToken: {
          allowance: parseUnits('10'),
        },
      });

      const { stateAfter } = await redeemInstant(fixture, {});

      expect(fromBN(stateAfter.paymentTokenState.allowance)).toEqual(0n);
    });

    it('when allowance is not set to u128.max - it should  decrease, mToken price is 1.1$', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        addPaymentToken: {
          allowance: parseUnits('11'),
        },
        mintPaymentTokenAndApprove: {
          amountBase9: parseUnits('11'),
        },
      });

      await updateManualFeedPrice(fixture, {
        price: parseUnits('1.1'),
      });

      const { stateAfter } = await redeemInstant(
        fixture,
        {},
        {},
        { tokensReceived: 10.89, fee: parseUnits('0.1') },
      );

      expect(fromBN(stateAfter.paymentTokenState.allowance)).toEqual(0n);
    });

    it('daily limit should decrease', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {});

      await updateVaultCommon(fixture, {
        instantDailyLimit: parseUnits('10'),
      });

      const { stateAfter } = await redeemInstant(fixture, {});

      expect(fromBN(stateAfter.commonVaultState.instantDailyLimitUsed)).toEqual(parseUnits('10'));
    });

    it('use all daily limit, then skip to next day and use all limit again', async () => {
      const fixture = await vaultsFixture();

      await updateFeed(fixture, {
        maxStaleness: 86400 * 2,
      });

      await updateFeed(fixture, {
        maxStaleness: 86400 * 2,
        feed: fixture.dataFeedPaymentToken.publicKey,
      });

      await prepareCommonRedeemTest(fixture, {
        mintMToken: { amount: parseUnits('20') },
        mintPaymentTokenAndApprove: { amountBase9: parseUnits('20') },
      });

      await updateVaultCommon(fixture, {
        instantDailyLimit: parseUnits('10'),
        vaultCommon: fixture.redeemerCommonVault.publicKey,
      });

      const { stateAfter } = await redeemInstant(fixture, {});

      expect(fromBN(stateAfter.commonVaultState.instantDailyLimitUsed)).toEqual(parseUnits('10'));

      await timeTravel(fixture.context, DAY);

      const { stateAfter: stateAfterNextDay } = await redeemInstant(fixture, {});

      expect(fromBN(stateAfterNextDay.commonVaultState.instantDailyLimitUsed)).toEqual(
        parseUnits('10'),
      );

      expect(stateAfterNextDay.commonVaultState.instantLastDay).toEqual(
        stateAfter.commonVaultState.instantLastDay + 1,
      );
    });

    it('when min_amount is 10 but user is free from min amounts', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        mintMToken: { amount: parseUnits('20') },
        mintPaymentTokenAndApprove: { amountBase9: parseUnits('20') },
      });

      await updateVaultCommon(fixture, {
        minAmount: parseUnits('10'),
        vaultCommon: fixture.redeemerCommonVault.publicKey,
      });

      await updateVaultCommonAccount(
        fixture,
        {
          freeFromMinAmount: true,
        },
        {
          commonVault: fixture.redeemerCommonVault.publicKey,
        },
      );

      await redeemInstant(
        fixture,
        {
          amountMToken: parseUnits('9'),
          minReceiveAmount: parseUnits('8.91'),
        },
        {},
        {
          fee: parseUnits('0.09'),
          tokensReceived: 8.91,
        },
      );
    });

    it('redeem 100 mToken, when price of stable is 1.05$, mToken price is 5$, token fee 1%, instant fee 0%', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        mintMToken: { amount: parseUnits('100') },
        mintPaymentTokenAndApprove: { amountBase9: parseUnits('495') },
      });

      await updateManualFeedPrice(fixture, {
        baseFeed: fixture.paymentMints.usdc.feed.publicKey,
        price: parseUnits('1.05'),
      });

      await updateManualFeedPrice(fixture, {
        price: parseUnits('5'),
      });

      await updateVaultCommon(fixture, {
        instantFee: parsePercent(0),
      });

      await redeemInstant(
        fixture,
        {
          amountMToken: parseUnits('100'),
          minReceiveAmount: parseUnits('495'),
        },
        {},
        {
          fee: parseUnits('1'),
          tokensReceived: 495,
        },
      );
    });

    it('redeem 100 USDC, stable = false, price of payment token is 1.05$, mToken price is 5$, token fee 1%, instant fee 0%', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        addPaymentToken: {
          stable: false,
        },
        mintMToken: { amount: parseUnits('100') },
        mintPaymentTokenAndApprove: { amountBase9: parseUnits('471.428571') },
      });

      await updateManualFeedPrice(fixture, {
        baseFeed: fixture.paymentMints.usdc.feed.publicKey,
        price: parseUnits('1.05'),
      });

      await updateManualFeedPrice(fixture, {
        price: parseUnits('5'),
      });

      await updateVaultCommon(fixture, {
        instantFee: parsePercent(0),
      });

      await redeemInstant(
        fixture,
        {
          amountMToken: parseUnits('100'),
          minReceiveAmount: parseUnits('20'),
        },
        {},
        {
          fee: parseUnits('1'),
          tokensReceived: 471.428571, // (100 - 1%) * 5 . 1.05
        },
      );
    });

    it('when request function is paused', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);
      await updatePauseInx(
        fixture,
        {
          fnId: VaultActionIds.REDEEM_REQUEST,
        },
        {
          commonVault: fixture.redeemerCommonVault.publicKey,
        },
      );

      await redeemInstant(fixture, {}, {});
    });

    it('should fail: when amount is 0', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);
      await redeemInstant(
        fixture,
        {
          amountMToken: 0n,
        },
        {},
        {},
        {
          revertedWith: VaultError.InvalidInAmount,
        },
      );
    });

    it('should fail: when payment token rate is 0', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        addPaymentToken: { stable: false },
      });
      await updateManualFeedPrice(fixture, {
        price: 0n,
        baseFeed: fixture.paymentMints.usdc.feed.publicKey,
      });
      await redeemInstant(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: DataFeedError.PriceIsLowerThanMin,
        },
      );
    });

    it('should fail: when function is paused', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);
      await updatePauseInx(
        fixture,
        {
          fnId: VaultActionIds.REDEEM_INSTANT,
        },
        {
          commonVault: fixture.redeemerCommonVault.publicKey,
        },
      );

      await redeemInstant(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.VaultInxPaused,
        },
      );
    });

    it('should fail: when vault is paused', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);
      await updatePause(
        fixture,
        {},
        {
          commonVault: fixture.redeemerCommonVault.publicKey,
        },
      );
      await redeemInstant(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.VaultPaused,
        },
      );
    });

    it('should fail: when allowance is insufficient', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        addPaymentToken: {
          allowance: parseUnits('0.1'),
        },
      });

      await redeemInstant(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.InsufficientAllowance,
        },
      );
    });

    it('should fail: when user`s balance is insufficient', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);

      await transferToken(fixture, {
        to: fixture.regularAccounts[0].publicKey,
        mint: {
          mint: fixture.mTBillMint.publicKey,
          feed: Keypair.generate(),
          decimals: 9,
        },
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      });

      await redeemInstant(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: CommonError.SplInsufficientFunds,
        },
      );
    });

    it('should fail: when vault`s balance is insufficient', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        mintPaymentTokenAndApprove: {
          amountBase9: parseUnits('1'),
        },
      });

      await redeemInstant(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: CommonError.SplInsufficientFunds,
        },
      );
    });

    it('should fail: when redeem amount is < min_amount', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);

      await updateVaultCommon(fixture, {
        minAmount: parseUnits('10.01'),
        vaultCommon: fixture.redeemerCommonVault.publicKey,
      });

      await redeemInstant(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.LessThanMinAmount,
        },
      );
    });

    it('should fail: when daily limit is exceeded', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);

      await updateVaultCommon(fixture, {
        instantDailyLimit: parseUnits('9'),
        vaultCommon: fixture.redeemerCommonVault.publicKey,
      });

      await redeemInstant(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.DailyLimitExceeded,
        },
      );
    });

    it('should fail: when received amount is < min_receive_amount', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);

      await redeemInstant(
        fixture,
        {
          minReceiveAmount: parseUnits('9.91'),
        },
        {},
        {},
        {
          revertedWith: VaultError.LessThanMinReceiveAmount,
        },
      );
    });

    it('should fail: when instant fee is 100%', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);

      await updateVaultCommon(fixture, {
        instantFee: parsePercent(100),
        vaultCommon: fixture.redeemerCommonVault.publicKey,
      });

      await redeemInstant(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.InvalidOutAmount,
        },
      );
    });

    it('should fail: when green list enabled and user is not green listed', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);

      await updateVaultCommon(fixture, {
        greenlistEnforced: true,
        vaultCommon: fixture.redeemerCommonVault.publicKey,
      });

      await redeemInstant(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.NotGreenListed,
        },
      );
    });

    it('should fail: user is in the black list', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);

      await updateAccountAc(fixture, {
        blackListed: true,
      });

      await redeemInstant(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.Blacklisted,
        },
      );
    });
  });

  describe('redeem_request', () => {
    it('should redeem request', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);
      await redeemRequest(fixture, {}, {});
    });

    it('when green list enabled and user is in green list', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);

      await updateVaultCommon(fixture, {
        greenlistEnforced: true,
      });

      await updateAccountAc(fixture, {
        greenListed: true,
      });

      await redeemRequest(fixture, {});
    });

    it('when user is waived from fee', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);

      await updateVaultCommonAccount(
        fixture,
        {
          waivedFee: true,
        },
        {
          commonVault: fixture.redeemerCommonVault.publicKey,
        },
      );

      await redeemRequest(
        fixture,
        {},
        {},
        {
          fee: 0n,
        },
      );
    });

    it('allowance should not change after the request initiation', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);

      const { stateAfter, stateBefore } = await redeemRequest(fixture, {});

      expect(
        stateAfter.paymentTokenState.allowance.eq(stateBefore.paymentTokenState.allowance),
      ).toBe(true);
    });

    it('instant daily limit should not change', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {});

      await updateVaultCommon(fixture, {
        instantDailyLimit: parseUnits('10'),
      });

      const { stateAfter, stateBefore } = await redeemRequest(fixture, {});

      expect(
        stateAfter.commonVaultState.instantDailyLimitUsed.eq(
          stateBefore.commonVaultState.instantDailyLimitUsed,
        ),
      ).toBe(true);
    });

    it('when min_amount is 10 but user is free from min amounts', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        mintMToken: { amount: parseUnits('20') },
        mintPaymentTokenAndApprove: { amountBase9: parseUnits('20') },
      });

      await updateVaultCommon(fixture, {
        minAmount: parseUnits('10'),
        vaultCommon: fixture.redeemerCommonVault.publicKey,
      });

      await updateVaultCommonAccount(
        fixture,
        {
          freeFromMinAmount: true,
        },
        {
          commonVault: fixture.redeemerCommonVault.publicKey,
        },
      );

      await redeemRequest(
        fixture,
        {
          amountMToken: parseUnits('9'),
        },
        {},
        {
          fee: parseUnits('0.09'),
        },
      );
    });

    it('request redeem 100 mToken, when price of stable is 1.05$, mToken price is 5$, token fee 1%, instant fee 0%', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        mintMToken: { amount: parseUnits('100') },
      });

      await updateManualFeedPrice(fixture, {
        baseFeed: fixture.paymentMints.usdc.feed.publicKey,
        price: parseUnits('1.05'),
      });

      await updateManualFeedPrice(fixture, {
        price: parseUnits('5'),
      });

      await updateVaultCommon(fixture, {
        instantFee: parsePercent(0),
      });

      await redeemRequest(
        fixture,
        {
          amountMToken: parseUnits('100'),
        },
        {},
        {
          fee: parseUnits('1'),
        },
      );
    });

    it('request redeem 100 USDC, stable = false, price of payment token is 1.05$, mToken price is 5$, token fee 1%, instant fee 0%', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        addPaymentToken: {
          stable: false,
        },
        mintMToken: { amount: parseUnits('100') },
      });

      await updateManualFeedPrice(fixture, {
        baseFeed: fixture.paymentMints.usdc.feed.publicKey,
        price: parseUnits('1.05'),
      });

      await updateManualFeedPrice(fixture, {
        price: parseUnits('5'),
      });

      await updateVaultCommon(fixture, {
        instantFee: parsePercent(0),
      });

      await redeemRequest(
        fixture,
        {
          amountMToken: parseUnits('100'),
        },
        {},
        {
          fee: parseUnits('1'),
        },
      );
    });

    it('create 2 requests in the row', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        addPaymentToken: {
          stable: false,
        },
        mintMToken: { amount: parseUnits('100') },
      });

      await redeemRequest(fixture, {}, {});
      await redeemRequest(fixture, {}, {});
    });

    it('should fail: when amount is 0', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);
      await redeemRequest(
        fixture,
        {
          amountMToken: 0n,
        },
        {},
        {},
        {
          revertedWith: VaultError.InvalidInAmount,
        },
      );
    });

    it('when allowance is insufficient it should not fail during request creation', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        addPaymentToken: {
          allowance: parseUnits('0.1'),
        },
      });

      await redeemRequest(fixture, {}, {});
    });

    it('when vault`s balance is insufficient it should not fail during request creation', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        mintPaymentTokenAndApprove: {
          amountBase9: parseUnits('1'),
        },
      });

      await redeemRequest(fixture, {}, {});
    });

    it('when instant function is paused', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);
      await updatePauseInx(
        fixture,
        {
          fnId: VaultActionIds.REDEEM_INSTANT,
        },
        {
          commonVault: fixture.redeemerCommonVault.publicKey,
        },
      );

      await redeemRequest(fixture, {}, {});
    });

    it('should fail: when payment token rate is 0', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        addPaymentToken: { stable: false },
      });
      await updateManualFeedPrice(fixture, {
        price: 0n,
        baseFeed: fixture.paymentMints.usdc.feed.publicKey,
      });
      await redeemRequest(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: DataFeedError.PriceIsLowerThanMin,
        },
      );
    });

    it('should fail: when function is paused', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);
      await updatePauseInx(
        fixture,
        {
          fnId: VaultActionIds.REDEEM_REQUEST,
        },
        {
          commonVault: fixture.redeemerCommonVault.publicKey,
        },
      );

      await redeemRequest(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.VaultInxPaused,
        },
      );
    });

    it('should fail: when vault is paused', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);
      await updatePause(
        fixture,
        {},
        {
          commonVault: fixture.redeemerCommonVault.publicKey,
        },
      );
      await redeemRequest(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.VaultPaused,
        },
      );
    });

    it('should fail: when user`s balance is insufficient', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);

      await transferToken(fixture, {
        to: fixture.regularAccounts[0].publicKey,
        mint: {
          mint: fixture.mTBillMint.publicKey,
          feed: Keypair.generate(),
          decimals: 9,
        },
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      });

      await redeemRequest(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: CommonError.SplInsufficientFunds,
        },
      );
    });

    it('should fail: when redeem amount is < min_amount', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);

      await updateVaultCommon(fixture, {
        minAmount: parseUnits('10.01'),
        vaultCommon: fixture.redeemerCommonVault.publicKey,
      });

      await redeemRequest(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.LessThanMinAmount,
        },
      );
    });

    it('should fail: when green list enabled and user is not green listed', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);

      await updateVaultCommon(fixture, {
        greenlistEnforced: true,
        vaultCommon: fixture.redeemerCommonVault.publicKey,
      });

      await redeemRequest(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.NotGreenListed,
        },
      );
    });

    it('should fail: user is in the black list', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);

      await updateAccountAc(fixture, {
        blackListed: true,
      });

      await redeemRequest(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.Blacklisted,
        },
      );
    });
  });

  describe('redeem_request_fiat', () => {
    it('should create redeem request fiat', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, { isFiat: true });
      await redeemRequest(fixture, { isFiat: true }, {});
    });

    it('when greenlist is enforced and user is in greenlist', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, { isFiat: true });
      await updateVaultCommon(fixture, {
        vaultCommon: fixture.redeemerCommonVault.publicKey,
        greenlistEnforced: true,
      });
      await redeemRequest(fixture, { isFiat: true }, {});
    });

    it('when fiat payment token fee is 2%', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        isFiat: true,
        addPaymentToken: {
          fee: parsePercent(2),
        },
      });
      await updateRedeemerVault(fixture, {});

      await redeemRequest(
        fixture,
        { isFiat: true },
        {},
        {
          fee: parseUnits('0.2'),
        },
      );
    });

    it('when fiat payment token fee is 2%, fiat_flat_fee is 1 mToken', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        isFiat: true,
        addPaymentToken: {
          fee: parsePercent(2),
        },
      });
      await updateRedeemerVault(fixture, {
        fiatFlatFee: parseUnits('1'),
      });

      await redeemRequest(
        fixture,
        { isFiat: true },
        {},
        {
          fee: parseUnits('1.2'),
        },
      );
    });

    it('should fail: when min_fiat_redeem_amount is > redeem amount and min_amount should not count', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        isFiat: true,
      });
      await updateRedeemerVault(fixture, {
        minFiatRedeemAmount: parseUnits('10.01'),
      });

      await updateVaultCommon(fixture, {
        minAmount: parseUnits('1'),
        vaultCommon: fixture.redeemerCommonVault.publicKey,
      });

      await redeemRequest(
        fixture,
        { isFiat: true },
        {},
        {},
        { revertedWith: VaultError.LessThanMinAmount },
      );
    });

    it('should fail: when greenlist not enforced and user is not greenlisted', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        isFiat: true,
        addToGreenList: false,
      });
      await redeemRequest(
        fixture,
        { isFiat: true },
        {},
        {},
        { revertedWith: VaultError.NotGreenListed },
      );
    });

    it('should fail: when fn is paused', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        isFiat: true,
      });

      await updatePauseInx(
        fixture,
        {
          fnId: VaultActionIds.REDEEM_REQUEST_FIAT,
        },
        {
          commonVault: fixture.redeemerCommonVault.publicKey,
        },
      );

      await redeemRequest(
        fixture,
        { isFiat: true },
        {},
        {},
        { revertedWith: VaultError.VaultInxPaused },
      );
    });

    it('should fail: when vault is paused', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        isFiat: true,
      });

      await updatePause(
        fixture,
        {},
        {
          commonVault: fixture.redeemerCommonVault.publicKey,
        },
      );

      await redeemRequest(
        fixture,
        { isFiat: true },
        {},
        {},
        { revertedWith: VaultError.VaultPaused },
      );
    });
  });

  describe('approve_redeem_request_fiat', () => {
    it('should approve redeem request fiat', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        isFiat: true,
      });
      await redeemRequest(fixture, { isFiat: true }, {});
      await approveRedeemRequest(fixture, { isFiat: true }, {});
    });

    it('should fail: try to approve non-fiat request', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {});
      await addPaymentToken(
        fixture,
        {
          mint: DEFAULT_PUBKEY,
        },
        {
          commonVault: fixture.redeemerCommonVault.publicKey,
        },
      );

      await redeemRequest(fixture, {}, {});
      await approveRedeemRequest(
        fixture,
        { isFiat: true },
        {},
        {},
        {
          revertedWith: VaultError.InvalidPaymentMint,
        },
      );
    });
  });

  describe('approve_redeem_request', () => {
    it('should approve redeem request', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        mintPaymentTokenAndApprove: {
          to: fixture.requestRedeemer.publicKey,
        },
      });
      await redeemRequest(fixture, {}, {});
      await approveRedeemRequest(fixture, {}, {});
    });

    it('when allowance is finite and it should decrease after approve', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        addPaymentToken: {
          allowance: parseUnits('9.9'),
        },
        mintPaymentTokenAndApprove: {
          to: fixture.requestRedeemer.publicKey,
        },
      });
      await redeemRequest(fixture, {}, {});
      const { stateAfter } = await approveRedeemRequest(fixture, {}, {}, { tokensReceived: 9.9 });

      expect(fromBN(stateAfter.paymentTokenState.allowance)).toEqual(0n);
    });

    it('when allowance is finite and it should decrease after approve and new rate is 1.1$', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        addPaymentToken: {
          allowance: parseUnits('10.89'),
        },
        mintPaymentTokenAndApprove: {
          to: fixture.requestRedeemer.publicKey,
          amountBase9: parseUnits('10.89'),
        },
      });
      await redeemRequest(fixture, {}, {});
      const { stateAfter } = await approveRedeemRequest(
        fixture,
        {
          newRate: parseUnits('1.1'),
        },
        {},
        { tokensReceived: 10.89 },
      );

      expect(fromBN(stateAfter.paymentTokenState.allowance)).toEqual(0n);
    });

    it('when safe=true and new rate do not exceed allowed deviation', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        mintPaymentTokenAndApprove: {
          to: fixture.requestRedeemer.publicKey,
          amountBase9: parseUnits('10.89'),
        },
      });
      await redeemRequest(fixture, {}, {});

      await approveRedeemRequest(
        fixture,
        {
          isSafe: true,
          newRate: parseUnits('1.1'),
        },
        {},
        {
          tokensReceived: 10.89,
        },
      );
    });

    it('should fail: call from non-authority', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {});
      await redeemRequest(fixture, {}, {});
      await approveRedeemRequest(
        fixture,
        {},
        {},
        {},
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        },
      );
    });

    it('should fail: when request redeemer approve is insufficient', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        mintPaymentTokenAndApprove: {
          doApprove: false,
          amountBase9: parseUnits('100'),
          to: fixture.requestRedeemer.publicKey,
        },
      });
      await redeemRequest(fixture, {}, {});
      await approveRedeemRequest(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: CommonError.SplOwnerDoesNotMatch,
        },
      );
    });

    it('should fail: when request redeemer balance is insufficient', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        mintPaymentTokenAndApprove: {
          amountBase9: parseUnits('0.01'),
          to: fixture.requestRedeemer.publicKey,
        },
      });
      await redeemRequest(fixture, {}, {});
      await approveRedeemRequest(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: CommonError.SplInsufficientFunds,
        },
      );
    });

    it('should fail: when safe is passed and new rate exceeds allowed deviation', async () => {
      const fixture = await vaultsFixture();
      await prepareCommonRedeemTest(fixture, {});
      await redeemRequest(fixture, {}, {});

      await approveRedeemRequest(
        fixture,
        {
          isSafe: true,
          newRate: parseUnits('1.11'),
        },
        {},
        {},
        {
          revertedWith: VaultError.VariationToleranceExceeded,
        },
      );
    });

    it('should revert when variation tolerance exceeded even with safeValidateLiquidity=true', async () => {
      const fixture = await vaultsFixture();
      await prepareCommonRedeemTest(fixture, {});
      await redeemRequest(fixture, {}, {});

      // safeValidateLiquidity only suppresses liquidity errors, not variation tolerance
      await approveRedeemRequest(
        fixture,
        { isSafe: true, newRate: parseUnits('1.11'), safeValidateLiquidity: true },
        {},
        {},
        {
          revertedWith: VaultError.VariationToleranceExceeded,
        },
      );
    });

    it('should silently skip with safeValidateLiquidity=true when request redeemer balance insufficient', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        mintPaymentTokenAndApprove: {
          amountBase9: parseUnits('0.01'),
          to: fixture.requestRedeemer.publicKey,
        },
      });
      await redeemRequest(fixture, {}, {});

      // Should not throw, silently skips
      await approveRedeemRequest(
        fixture,
        { safeValidateLiquidity: true },
        {},
        { expectSkipped: true },
      );
    });
  });

  describe('safe_approve_redeem_request_at_current_rate', () => {
    it('should approve redeem request at current rate', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        mintPaymentTokenAndApprove: {
          to: fixture.requestRedeemer.publicKey,
        },
      });
      await redeemRequest(fixture, {}, {});

      await safeApproveRedeemRequestAtCurrentRate(fixture, {});
    });

    it('should fail: when current rate exceeds variation tolerance', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        mintPaymentTokenAndApprove: {
          to: fixture.requestRedeemer.publicKey,
        },
      });
      await redeemRequest(fixture, {}, {});

      // Change rate significantly after request was created
      await updateManualFeedPrice(fixture, {
        price: parseUnits('1.11'),
      });

      await safeApproveRedeemRequestAtCurrentRate(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.VariationToleranceExceeded,
        },
      );
    });

    it('should revert when variation tolerance exceeded even with safeValidateLiquidity=true', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        mintPaymentTokenAndApprove: {
          to: fixture.requestRedeemer.publicKey,
        },
      });
      await redeemRequest(fixture, {}, {});

      // Change rate significantly after request was created
      await updateManualFeedPrice(fixture, {
        price: parseUnits('1.11'),
      });

      // safeValidateLiquidity only suppresses liquidity errors, not variation tolerance
      await safeApproveRedeemRequestAtCurrentRate(
        fixture,
        { safeValidateLiquidity: true },
        {},
        {},
        {
          revertedWith: VaultError.VariationToleranceExceeded,
        },
      );
    });

    it('should fail: call from non-authority', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        mintPaymentTokenAndApprove: {
          to: fixture.requestRedeemer.publicKey,
        },
      });
      await redeemRequest(fixture, {}, {});

      await safeApproveRedeemRequestAtCurrentRate(
        fixture,
        {},
        {},
        {},
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        },
      );
    });

    it('should process bulk approvals with safeValidateLiquidity=true, skipping requests with insufficient liquidity', async () => {
      const fixture = await vaultsFixture();
      const {
        vaultsProgram,
        dataFeedProgram,
        context,
        authority,
        regularAccounts,
        redeemerCommonVault,
        paymentMints,
        connection,
      } = fixture;

      const [user0, user1, user2] = regularAccounts;
      const paymentMint = paymentMints.usdc;
      const commonVault = redeemerCommonVault.publicKey;

      // Add payment token with 0% fee to simplify math
      await addPaymentToken(fixture, { fee: 0n }, { commonVault });

      // Setup each user: vault common account, AC account, mTokens, payment token ATA
      for (const user of [user0, user1, user2]) {
        await newVaultCommonAccount(fixture, { account: user.publicKey }, { commonVault });
        await newAccountAc(fixture, { account: user.publicKey });

        // Create payment token ATA for receiving funds
        await getOrCreateAta(context, connection, paymentMint.mint, user.publicKey, authority);
      }

      // Mint mTokens to each user: 10, 70, 25
      await mintMToken(fixture, { to: user0.publicKey, amount: parseUnits('10') });
      await mintMToken(fixture, { to: user1.publicKey, amount: parseUnits('70') });
      await mintMToken(fixture, { to: user2.publicKey, amount: parseUnits('25') });

      // Create redeem requests for each user
      // Request 0: 10 mTokens -> 10 USDC
      await redeemRequest(
        fixture,
        { amountMToken: parseUnits('10') },
        { commonVault },
        { fee: 0n },
        { from: user0 },
      );

      // Request 1: 70 mTokens -> 70 USDC
      await redeemRequest(
        fixture,
        { amountMToken: parseUnits('70') },
        { commonVault },
        { fee: 0n },
        { from: user1 },
      );

      // Request 2: 25 mTokens -> 25 USDC
      await redeemRequest(
        fixture,
        { amountMToken: parseUnits('25') },
        { commonVault },
        { fee: 0n },
        { from: user2 },
      );

      // Fund requestRedeemer with exactly 50 USDC
      await mintPaymentTokenAndApprove(fixture, {
        to: fixture.requestRedeemer.publicKey,
        amountBase9: parseUnits('50'),
      });

      // Fetch state needed to build instructions
      const redeemerVaultPda = getRedeemerVaultPda(commonVault);
      const commonVaultState = await fetchVaultCommonState(vaultsProgram, commonVault);
      const redeemerVaultState = await fetchRedeemerVaultState(vaultsProgram, redeemerVaultPda);
      const mMintFeed = await fetchDataFeedState(dataFeedProgram, commonVaultState.mMintFeed);

      // Build 3 approve instructions with safeValidateLiquidity=true
      const buildApproveInstruction = async (requestId: bigint, user: Keypair) => {
        return vaultsProgram.methods
          .safeApproveRedeemRequestAtCurrentRate(toBN(requestId), true)
          .accountsPartial({
            vaultCommon: commonVault,
            authority: authority.publicKey,
            redeemRequest: getRedeemerVaultRequestPda(redeemerVaultPda, requestId),
            userAccount: user.publicKey,
            mMint: commonVaultState.mMint,
            mMintFeed: mMintFeed.underlyingFeed,
            mMintDataFeed: commonVaultState.mMintFeed,
            mMintTokenProgram: TOKEN_2022_PROGRAM_ID,
            paymentMint: paymentMint.mint,
            paymentMintTokenProgram: TOKEN_PROGRAM_ID,
            requestRedeemer: redeemerVaultState.requestRedeemer,
            authorityAcRole: getAccountAcRoleStatePda(
              commonVaultState.acRole,
              authority.publicKey,
              VAULT_AC_ROLES.VAULT_ADMIN,
            ),
          })
          .instruction();
      };

      const ix0 = await buildApproveInstruction(0n, user0);
      const ix1 = await buildApproveInstruction(1n, user1);
      const ix2 = await buildApproveInstruction(2n, user2);

      // Get balances before
      const redeemerBalanceBefore = await getBalance(
        connection,
        fixture.requestRedeemer.publicKey,
        paymentMint.mint,
      );
      expect(redeemerBalanceBefore).toEqual(parseUnits('50', paymentMint.decimals));

      // Execute bulk transaction
      const tx = new Transaction().add(ix0, ix1, ix2);
      await expectTxNotReverted(context, tx, [authority]);

      // Verify results
      // Request 0 should be closed (user0 received 10 USDC)
      const request0After = await fetchRedeemerVaultRequestState(
        vaultsProgram,
        getRedeemerVaultRequestPda(redeemerVaultPda, 0n),
        true,
      );
      expect(request0After).toEqual(null);

      // Request 1 should still exist (skipped - needed 70 but only 40 available)
      const request1After = await fetchRedeemerVaultRequestState(
        vaultsProgram,
        getRedeemerVaultRequestPda(redeemerVaultPda, 1n),
        true,
      );
      expect(request1After).not.toEqual(null);
      expect(fromBN(request1After.mTokenAmount)).toEqual(parseUnits('70'));

      // Request 2 should be closed (user2 received 25 USDC)
      const request2After = await fetchRedeemerVaultRequestState(
        vaultsProgram,
        getRedeemerVaultRequestPda(redeemerVaultPda, 2n),
        true,
      );
      expect(request2After).toEqual(null);

      // Verify user balances
      const user0PaymentBalance = await getBalance(connection, user0.publicKey, paymentMint.mint);
      expect(user0PaymentBalance).toEqual(parseUnits('10', paymentMint.decimals));

      const user1PaymentBalance = await getBalance(connection, user1.publicKey, paymentMint.mint);
      expect(user1PaymentBalance).toEqual(0n); // Skipped, got nothing

      const user2PaymentBalance = await getBalance(connection, user2.publicKey, paymentMint.mint);
      expect(user2PaymentBalance).toEqual(parseUnits('25', paymentMint.decimals));

      // Verify final requestRedeemer balance is 15 USDC
      const redeemerBalanceAfter = await getBalance(
        connection,
        fixture.requestRedeemer.publicKey,
        paymentMint.mint,
      );
      expect(redeemerBalanceAfter).toEqual(parseUnits('15', paymentMint.decimals));
    });

    it('should measure transaction size limits for bulk approvals', async () => {
      const fixture = await vaultsFixture();
      const {
        vaultsProgram,
        dataFeedProgram,
        context,
        authority,
        regularAccounts,
        redeemerCommonVault,
        paymentMints,
        connection,
      } = fixture;

      const paymentMint = paymentMints.usdc;
      const commonVault = redeemerCommonVault.publicKey;

      // Add payment token with 0% fee
      await addPaymentToken(fixture, { fee: 0n }, { commonVault });

      // Use all available regular accounts (fixture provides 10 accounts, first is authority)
      const users = regularAccounts.slice(0, 9); // Take up to 9 users

      // Setup each user
      for (const user of users) {
        await newVaultCommonAccount(fixture, { account: user.publicKey }, { commonVault });
        await newAccountAc(fixture, { account: user.publicKey });
        await getOrCreateAta(context, connection, paymentMint.mint, user.publicKey, authority);
        await mintMToken(fixture, { to: user.publicKey, amount: parseUnits('10') });
      }

      // Create redeem requests for each user
      for (const user of users) {
        await redeemRequest(
          fixture,
          { amountMToken: parseUnits('10') },
          { commonVault },
          { fee: 0n },
          { from: user },
        );
      }

      // Fund requestRedeemer with enough for all
      await mintPaymentTokenAndApprove(fixture, {
        to: fixture.requestRedeemer.publicKey,
        amountBase9: parseUnits('1000'),
      });

      // Fetch state needed to build instructions
      const redeemerVaultPda = getRedeemerVaultPda(commonVault);
      const commonVaultState = await fetchVaultCommonState(vaultsProgram, commonVault);
      const redeemerVaultState = await fetchRedeemerVaultState(vaultsProgram, redeemerVaultPda);
      const mMintFeed = await fetchDataFeedState(dataFeedProgram, commonVaultState.mMintFeed);

      // Build approve instruction for a user
      const buildApproveInstruction = async (requestId: bigint, user: Keypair) => {
        return vaultsProgram.methods
          .safeApproveRedeemRequestAtCurrentRate(toBN(requestId), true)
          .accountsPartial({
            vaultCommon: commonVault,
            authority: authority.publicKey,
            redeemRequest: getRedeemerVaultRequestPda(redeemerVaultPda, requestId),
            userAccount: user.publicKey,
            mMint: commonVaultState.mMint,
            mMintFeed: mMintFeed.underlyingFeed,
            mMintDataFeed: commonVaultState.mMintFeed,
            mMintTokenProgram: TOKEN_2022_PROGRAM_ID,
            paymentMint: paymentMint.mint,
            paymentMintTokenProgram: TOKEN_PROGRAM_ID,
            requestRedeemer: redeemerVaultState.requestRedeemer,
            authorityAcRole: getAccountAcRoleStatePda(
              commonVaultState.acRole,
              authority.publicKey,
              VAULT_AC_ROLES.VAULT_ADMIN,
            ),
          })
          .instruction();
      };

      // Build instructions for all users
      const instructions = await Promise.all(
        users.map((user, idx) => buildApproveInstruction(BigInt(idx), user)),
      );

      // Measure transaction sizes with increasing number of instructions
      const sizes: { count: number; size: number; fits: boolean }[] = [];

      for (let i = 1; i <= instructions.length; i++) {
        const tx = new Transaction();
        tx.recentBlockhash = context.latestBlockhash();
        tx.feePayer = authority.publicKey;

        for (let j = 0; j < i; j++) {
          tx.add(instructions[j]);
        }

        try {
          const serialized = tx.serialize({ requireAllSignatures: false });
          const size = serialized.length;
          const fits = size <= 1232;

          sizes.push({ count: i, size, fits });
          console.log(
            `${i} instruction(s): ${size} bytes ${fits ? '✓' : '✗ (exceeds 1232 limit)'}`,
          );
        } catch (e) {
          // Transaction too large to serialize
          const errorMsg = e instanceof Error ? e.message : String(e);
          const sizeMatch = errorMsg.match(/(\d+) > 1232/);
          const estimatedSize = sizeMatch ? parseInt(sizeMatch[1]) : 0;

          sizes.push({ count: i, size: estimatedSize, fits: false });
          console.log(`${i} instruction(s): ~${estimatedSize} bytes ✗ (exceeds 1232 limit)`);
        }
      }

      // Find the maximum number of instructions that fit
      const maxInstructions = sizes.filter((s) => s.fits).length;

      console.log(`\n=== TRANSACTION SIZE ANALYSIS ===`);
      console.log(`Max instructions that fit in single tx: ${maxInstructions}`);
      console.log(`Transaction size limit: 1232 bytes`);

      // Verify at least 2 instructions fit (we know 3 worked in previous test)
      expect(maxInstructions).toBeGreaterThanOrEqual(2);

      // Actually execute a transaction with the max fitting instructions
      if (maxInstructions > 0) {
        const tx = new Transaction();
        for (let i = 0; i < maxInstructions; i++) {
          tx.add(instructions[i]);
        }

        await expectTxNotReverted(context, tx, [authority]);

        // Verify the requests were processed
        for (let i = 0; i < maxInstructions; i++) {
          const requestState = await fetchRedeemerVaultRequestState(
            vaultsProgram,
            getRedeemerVaultRequestPda(redeemerVaultPda, BigInt(i)),
            true,
          );
          expect(requestState).toEqual(null); // Should be closed
        }

        console.log(`Successfully executed ${maxInstructions} approvals in single transaction!`);
      }
    });
  });

  describe('safe_approve_redeem_request_at_request_rate', () => {
    it('should approve redeem request at request rate', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        mintPaymentTokenAndApprove: {
          to: fixture.requestRedeemer.publicKey,
        },
      });
      await redeemRequest(fixture, {}, {});

      await safeApproveRedeemRequestAtRequestRate(fixture, {});
    });

    it('should succeed even when current rate changed significantly', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        mintPaymentTokenAndApprove: {
          to: fixture.requestRedeemer.publicKey,
        },
      });
      await redeemRequest(fixture, {}, {});

      // Change rate significantly after request was created
      await updateManualFeedPrice(fixture, {
        price: parseUnits('1.5'),
      });

      // Should still succeed using the original request rate
      await safeApproveRedeemRequestAtRequestRate(fixture, {});
    });

    it('should silently skip with safeValidateLiquidity=true when request redeemer balance insufficient', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        mintPaymentTokenAndApprove: {
          amountBase9: parseUnits('0.01'),
          to: fixture.requestRedeemer.publicKey,
        },
      });
      await redeemRequest(fixture, {}, {});

      // Should not throw, silently skips
      await safeApproveRedeemRequestAtRequestRate(
        fixture,
        { safeValidateLiquidity: true },
        {},
        { expectSkipped: true },
      );
    });

    it('should fail: call from non-authority', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        mintPaymentTokenAndApprove: {
          to: fixture.requestRedeemer.publicKey,
        },
      });
      await redeemRequest(fixture, {}, {});

      await safeApproveRedeemRequestAtRequestRate(
        fixture,
        {},
        {},
        {},
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        },
      );
    });
  });

  describe('reject_redeem_request', () => {
    it('should reject redeem request', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {});
      await redeemRequest(fixture, {}, {});
      await rejectRedeemRequest(fixture, {}, {});
    });

    it('should reject redeem fiat request', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, { isFiat: true });
      await redeemRequest(fixture, { isFiat: true }, {});
      await rejectRedeemRequest(fixture, {}, {});
    });

    it('should fail: call from non-authority', async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {});
      await redeemRequest(fixture, {}, {});
      await rejectRedeemRequest(
        fixture,
        {},
        {},
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        },
      );
    });
  });
});
