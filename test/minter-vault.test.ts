import { vaultsFixture } from "./fixture/vaults.fixture";
import {
  VaultActionIds,
  VaultError,
  VAULTS_PROGRAM_ID,
} from "./constants/vaults.constants";

import {
  addPaymentToken,
  newVaultCommon,
  newVaultCommonAccount,
  updatePause,
  updatePauseInx,
  updatePaymentToken,
  updateVaultCommon,
  updateVaultCommonAccount,
} from "./testers/common-vaults.testers";
import { newAccountAc, updateAccountAc } from "./testers/ac.testers";
import {
  approveMintRequest,
  mintInstant,
  mintRequest,
  newMinterVault,
  prepareCommonMintTest,
  rejectMintRequest,
  updateMinterVault,
} from "./testers/minter-vault.testers";
import { CommonError, MAX_U128 } from "./constants/common.constants";
import {
  fromBN,
  getBalance,
  parsePercent,
  parseUnits,
  timeTravel,
} from "./helpers/common.helpers";
import { updateFeed, updateManualFeed } from "./testers/data-feed.testers";
import { DataFeedError } from "./constants/data-feed.constants";
import { transferToken } from "./testers/redeem-vault.testers";
import { Clock } from "solana-bankrun";

describe("minter-vault", () => {
  describe("initializing", () => {
    it("Should deploy program", async () => {
      const { vaultsProgram } = await vaultsFixture();
      expect(vaultsProgram.programId.equals(VAULTS_PROGRAM_ID)).toBe(true);
    });
  });

  describe("new_minter_vault", () => {
    it("call with default params", async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await newMinterVault(fixture, { commonVault });
    });

    it("should fail; call from non-authority", async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await newMinterVault(
        fixture,
        { commonVault },
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        }
      );
    });
  });

  describe("update_minter_vault", () => {
    it("call with default params", async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await newMinterVault(fixture, { commonVault });
      await updateMinterVault(fixture, { commonVault });
    });

    it("update new_first_deposit_min_m_tokens", async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await newMinterVault(fixture, { commonVault });
      await updateMinterVault(fixture, {
        commonVault,
        firstDepositMinMTokens: parseUnits("100"),
      });
    });

    it("update mint_authority_pda", async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await newMinterVault(fixture, { commonVault });
      await updateMinterVault(fixture, {
        commonVault,
        tokenAuthority: fixture.regularAccounts[0].publicKey,
      });
    });

    it("should fail; call from non-authority", async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await newMinterVault(fixture, { commonVault });
      await updateMinterVault(
        fixture,
        { commonVault },
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        }
      );
    });
  });

  describe("mint_instant", () => {
    it("should mint instant", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);
      await mintInstant(
        fixture,
        {},
        {},
        {
          fee: 0.1,
          tokensMinted: parseUnits("9.9"),
        }
      );
    });

    it("when green list enabled and user is in green list", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await updateVaultCommon(fixture, {
        greenlistEnforced: true,
      });

      await updateAccountAc(fixture, {
        greenListed: true,
      });

      await mintInstant(fixture, {});
    });

    it("when user is waived from fee", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await updateVaultCommonAccount(fixture, {
        waivedFee: true,
      });

      await mintInstant(
        fixture,
        {},
        {},
        {
          fee: 0,
          tokensMinted: parseUnits("10"),
        }
      );
    });

    it("when allowance is set to u128.max - it should not decrease", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await mintInstant(fixture, {});
    });

    it("when allowance is not set to u128.max - it should  decrease", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture, {
        addPaymentToken: {
          allowance: parseUnits("10"),
        },
      });

      const { stateAfter } = await mintInstant(fixture, {});

      expect(fromBN(stateAfter.paymentTokenState.allowance)).toEqual(0n);
    });

    it("when allowance is not set to u128.max - it should  decrease, mToken price is 1.1$", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture, {
        addPaymentToken: {
          allowance: parseUnits("11"),
        },
      });

      await updateManualFeed(fixture, {
        price: parseUnits("1.1"),
      });

      const { stateAfter } = await mintInstant(
        fixture,
        {
          amountToken: 11,
        },
        {},
        {
          tokensMinted: parseUnits("9.9"),
          fee: 0.11,
        }
      );

      expect(fromBN(stateAfter.paymentTokenState.allowance)).toEqual(0n);
    });

    it("daily limit should decrease", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture, {});

      await updateVaultCommon(fixture, {
        instantDailyLimit: parseUnits("9.9"),
      });

      const { stateAfter } = await mintInstant(fixture, {});

      expect(fromBN(stateAfter.commonVaultState.instantDailyLimitUsed)).toEqual(
        parseUnits("9.9")
      );
    });

    it("use all daily limit, then skip to next day and use all limit again", async () => {
      const fixture = await vaultsFixture();

      await updateFeed(fixture, {
        maxStaleness: 86400 * 2,
      });

      await updateFeed(fixture, {
        maxStaleness: 86400 * 2,
        feed: fixture.dataFeedPaymentToken.publicKey,
      });

      await prepareCommonMintTest(fixture, {});

      await updateVaultCommon(fixture, {
        instantDailyLimit: parseUnits("9.9"),
      });

      const { stateAfter } = await mintInstant(fixture, {});

      expect(fromBN(stateAfter.commonVaultState.instantDailyLimitUsed)).toEqual(
        parseUnits("9.9")
      );

      await timeTravel(fixture.context, 86400n);

      const { stateAfter: stateAfterNextDay } = await mintInstant(fixture, {});

      expect(
        fromBN(stateAfterNextDay.commonVaultState.instantDailyLimitUsed)
      ).toEqual(parseUnits("9.9"));

      expect(stateAfterNextDay.commonVaultState.instantLastDay).toEqual(
        stateAfter.commonVaultState.instantLastDay + 1
      );
    });

    it("when first_deposit_min_m_tokens is 10 and mint amount is 10.0089", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await updateMinterVault(fixture, {
        firstDepositMinMTokens: parseUnits("10"),
      });

      await mintInstant(
        fixture,
        {
          amountToken: 10.11,
        },
        {},
        {
          fee: 0.1011,
          tokensMinted: parseUnits("10.0089"),
        }
      );
    });

    it("when first_deposit_min_m_tokens is 10 and mint amount is 10 and user is waived from fee", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await updateMinterVault(fixture, {
        firstDepositMinMTokens: parseUnits("10"),
      });

      await updateVaultCommonAccount(fixture, {
        waivedFee: true,
      });

      await mintInstant(
        fixture,
        {
          amountToken: 10,
        },
        {},
        {
          fee: 0,
          tokensMinted: parseUnits("10"),
        }
      );
    });

    it("when first_deposit_min_m_tokens is 10 but user already minted tokens", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await updateMinterVault(fixture, {
        firstDepositMinMTokens: parseUnits("10"),
      });

      await updateVaultCommonAccount(fixture, {
        waivedFee: true,
      });

      await mintInstant(
        fixture,
        {
          amountToken: 10,
        },
        {},
        {
          fee: 0,
          tokensMinted: parseUnits("10"),
        }
      );

      await mintInstant(
        fixture,
        {
          amountToken: 1,
          minReceiveAmount: parseUnits("1"),
        },
        {},
        {
          fee: 0,
          tokensMinted: parseUnits("1"),
        }
      );
    });

    it("when first_deposit_min_m_tokens is 10 but user is free from min amounts", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await updateMinterVault(fixture, {
        firstDepositMinMTokens: parseUnits("10"),
      });

      await updateVaultCommonAccount(fixture, {
        freeFromMinAmount: true,
      });

      await mintInstant(
        fixture,
        {
          amountToken: 9,
          minReceiveAmount: parseUnits("8.91"),
        },
        {},
        {
          fee: 0.09,
          tokensMinted: parseUnits("8.91"),
        }
      );
    });

    it("when min_amount is 10 but user is free from min amounts", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await updateVaultCommon(fixture, {
        minAmount: parseUnits("10"),
      });

      await updateVaultCommonAccount(fixture, {
        freeFromMinAmount: true,
      });

      await mintInstant(
        fixture,
        {
          amountToken: 9,
          minReceiveAmount: parseUnits("8.91"),
        },
        {},
        {
          fee: 0.09,
          tokensMinted: parseUnits("8.91"),
        }
      );
    });

    it("deposit 100 USDC, when price of stable is 1.05$, mToken price is 5$, token fee 1%, instant fee 0%", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await updateManualFeed(fixture, {
        baseFeed: fixture.paymentMints.usdc.feed.publicKey,
        price: parseUnits("1.05"),
      });

      await updateManualFeed(fixture, {
        price: parseUnits("5"),
      });

      await updateVaultCommon(fixture, {
        instantFee: parsePercent(0),
      });

      await mintInstant(
        fixture,
        {
          amountToken: 100,
          minReceiveAmount: parseUnits("19.8"),
        },
        {},
        {
          fee: 1,
          tokensMinted: parseUnits("19.8"),
        }
      );
    });

    it("deposit 100 USDC, stable = false, price of payment token is 1.05$, mToken price is 5$, token fee 1%, instant fee 0%", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture, {
        addPaymentToken: {
          stable: false,
        },
      });

      await updateManualFeed(fixture, {
        baseFeed: fixture.paymentMints.usdc.feed.publicKey,
        price: parseUnits("1.05"),
      });

      await updateManualFeed(fixture, {
        price: parseUnits("5"),
      });

      await updateVaultCommon(fixture, {
        instantFee: parsePercent(0),
      });

      await mintInstant(
        fixture,
        {
          amountToken: 100,
          minReceiveAmount: parseUnits("20"),
        },
        {},
        {
          fee: 1,
          tokensMinted: parseUnits("20.79"), // (105 - 1%) / 5
        }
      );
    });

    it("should fail: when amount is 0", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);
      await mintInstant(
        fixture,
        {
          amountToken: 0,
        },
        {},
        {},
        {
          revertedWith: VaultError.InvalidInAmount,
        }
      );
    });

    it("should fail: when payment token rate is 0", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture, {
        addPaymentToken: { stable: false },
      });
      await updateManualFeed(fixture, {
        price: 0n,
        baseFeed: fixture.paymentMints.usdc.feed.publicKey,
      });
      await mintInstant(
        fixture,
        {},
        {},
        {},
        {
          // TODO: find a way to proxify errors
          revertedWith: CommonError.GenericError,
        }
      );
    });

    it("should fail: when function is paused", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);
      await updatePauseInx(fixture, {
        fnId: VaultActionIds.MINT_INSTANT,
      });
      await mintInstant(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.VaultInxPaused,
        }
      );
    });

    it("should fail: when vault is paused", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);
      await updatePause(fixture, {});
      await mintInstant(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.VaultPaused,
        }
      );
    });

    it("should fail: when allowance is insufficient", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture, {
        addPaymentToken: {
          allowance: parseUnits("0.1"),
        },
      });

      await mintInstant(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.InsufficientAllowance,
        }
      );
    });

    it("should fail: when user`s balance is insufficient", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await transferToken(fixture, {
        to: fixture.regularAccounts[0].publicKey,
      });

      await mintInstant(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: CommonError.SplInsufficientFunds,
        }
      );
    });

    it("should fail: when deposit amount is < min_amount", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await updateVaultCommon(fixture, {
        minAmount: parseUnits("10"),
      });

      await mintInstant(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.LessThanMinAmount,
        }
      );
    });

    it("should fail: when deposit amount is < first_deposit_min_m_tokens", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await updateMinterVault(fixture, {
        firstDepositMinMTokens: parseUnits("10"),
      });

      await mintInstant(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.LessThanMinAmountFirstMint,
        }
      );
    });

    it("should fail: when daily limit is exceeded", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await updateVaultCommon(fixture, {
        instantDailyLimit: parseUnits("9"),
      });

      await mintInstant(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.DailyLimitExceeded,
        }
      );
    });

    it("should fail: when received amount is < min_receive_amount", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await mintInstant(
        fixture,
        {
          minReceiveAmount: parseUnits("9.91"),
        },
        {},
        {},
        {
          revertedWith: VaultError.LessThanMinReceiveAmount,
        }
      );
    });

    it("should fail: when instant fee is 100%", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await updateVaultCommon(fixture, {
        instantFee: parsePercent(100),
      });

      await mintInstant(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.InvalidConvertAmount,
        }
      );
    });

    it("should fail: when green list enabled and user is not green listed", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await updateVaultCommon(fixture, {
        greenlistEnforced: true,
      });

      await mintInstant(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.NotGreenListed,
        }
      );
    });

    it("should fail: user is in the black list", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await updateAccountAc(fixture, {
        blackListed: true,
      });

      await mintInstant(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.Blacklisted,
        }
      );
    });
  });

  describe("mint_request", () => {
    it("should create mint request", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);
      await mintRequest(fixture, {}, {});
    });

    it("when green list enabled and user is in green list", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await updateVaultCommon(fixture, {
        greenlistEnforced: true,
      });

      await updateAccountAc(fixture, {
        greenListed: true,
      });

      await mintRequest(fixture, {});
    });

    it("when user is waived from fee", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await updateVaultCommonAccount(fixture, {
        waivedFee: true,
      });

      const { stateAfter } = await mintRequest(
        fixture,
        {},
        {},
        {
          fee: 0,
        }
      );

      expect(
        stateAfter.commonVaultRequestState.depositedUsd.eq(
          stateAfter.commonVaultRequestState.depositedUsdWoFees
        )
      );

      expect(fromBN(stateAfter.commonVaultRequestState.depositedUsd)).toEqual(
        parseUnits("10")
      );
    });

    it("when allowance is set to u128.max - it should not decrease", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await mintRequest(fixture, {});
    });

    it("when allowance is not set to u128.max - it should  decrease", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture, {
        addPaymentToken: {
          allowance: parseUnits("10"),
        },
      });

      const { stateAfter } = await mintRequest(fixture, {});

      expect(fromBN(stateAfter.paymentTokenState.allowance)).toEqual(0n);
    });

    it("when allowance is not set to u128.max - it should  decrease, mToken price is 1.1$", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture, {
        addPaymentToken: {
          allowance: parseUnits("11"),
        },
      });

      await updateManualFeed(fixture, {
        price: parseUnits("1.1"),
      });

      const { stateAfter } = await mintRequest(
        fixture,
        {
          amountToken: 11,
        },
        {},
        {
          fee: 0.11,
        }
      );

      expect(fromBN(stateAfter.paymentTokenState.allowance)).toEqual(0n);
    });

    it("when first_deposit_min_m_tokens is 10 and mint amount is 10.0089", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await updateMinterVault(fixture, {
        firstDepositMinMTokens: parseUnits("10"),
      });

      await mintRequest(
        fixture,
        {
          amountToken: 10.11,
        },
        {},
        {
          fee: 0.1011,
        }
      );
    });

    it("when first_deposit_min_m_tokens is 10 and mint amount is 10 and user is waived from fee", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await updateMinterVault(fixture, {
        firstDepositMinMTokens: parseUnits("10"),
      });

      await updateVaultCommonAccount(fixture, {
        waivedFee: true,
      });

      await mintRequest(
        fixture,
        {
          amountToken: 10,
        },
        {},
        {
          fee: 0,
        }
      );
    });

    it("when first_deposit_min_m_tokens is 10 but user already minted tokens", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await updateMinterVault(fixture, {
        firstDepositMinMTokens: parseUnits("10"),
      });

      await updateVaultCommonAccount(fixture, {
        waivedFee: true,
      });

      await mintInstant(
        fixture,
        {
          amountToken: 10,
        },
        {},
        {
          fee: 0,
          tokensMinted: parseUnits("10"),
        }
      );

      await mintRequest(
        fixture,
        {
          amountToken: 1,
        },
        {},
        {
          fee: 0,
        }
      );
    });

    it("when first_deposit_min_m_tokens is 10 but user is free from min amounts", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await updateMinterVault(fixture, {
        firstDepositMinMTokens: parseUnits("10"),
      });

      await updateVaultCommonAccount(fixture, {
        freeFromMinAmount: true,
      });

      await mintRequest(
        fixture,
        {
          amountToken: 9,
        },
        {},
        {
          fee: 0.09,
        }
      );
    });

    it("when min_amount is 10 but user is free from min amounts", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await updateVaultCommon(fixture, {
        minAmount: parseUnits("10"),
      });

      await updateVaultCommonAccount(fixture, {
        freeFromMinAmount: true,
      });

      await mintRequest(
        fixture,
        {
          amountToken: 9,
        },
        {},
        {
          fee: 0.09,
        }
      );
    });

    it("deposit 100 USDC, when price of stable is 1.05$, mToken price is 5$, token fee 1%, instant fee 0%", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await updateManualFeed(fixture, {
        baseFeed: fixture.paymentMints.usdc.feed.publicKey,
        price: parseUnits("1.05"),
      });

      await updateManualFeed(fixture, {
        price: parseUnits("5"),
      });

      await updateVaultCommon(fixture, {
        instantFee: parsePercent(0),
      });

      await mintRequest(
        fixture,
        {
          amountToken: 100,
        },
        {},
        {
          fee: 1,
        }
      );
    });

    it("deposit 100 USDC, stable = false, price of payment token is 1.05$, mToken price is 5$, token fee 1%, instant fee 0%", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture, {
        addPaymentToken: {
          stable: false,
        },
      });

      await updateManualFeed(fixture, {
        baseFeed: fixture.paymentMints.usdc.feed.publicKey,
        price: parseUnits("1.05"),
      });

      await updateManualFeed(fixture, {
        price: parseUnits("5"),
      });

      await updateVaultCommon(fixture, {
        instantFee: parsePercent(0),
      });

      await mintRequest(
        fixture,
        {
          amountToken: 100,
        },
        {},
        {
          fee: 1,
        }
      );
    });

    it("should fail: when amount is 0", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);
      await mintRequest(
        fixture,
        {
          amountToken: 0,
        },
        {},
        {},
        {
          revertedWith: VaultError.InvalidInAmount,
        }
      );
    });

    it("should fail: when payment token rate is 0", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture, {
        addPaymentToken: { stable: false },
      });
      await updateManualFeed(fixture, {
        price: 0n,
        baseFeed: fixture.paymentMints.usdc.feed.publicKey,
      });
      await mintRequest(
        fixture,
        {},
        {},
        {},
        {
          // TODO: find a way to proxify errors
          revertedWith: CommonError.GenericError,
        }
      );
    });

    it("should fail: when function is paused", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);
      await updatePauseInx(fixture, {
        fnId: VaultActionIds.MINT_REQUEST,
      });
      await mintRequest(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.VaultInxPaused,
        }
      );
    });

    it("should fail: when vault is paused", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);
      await updatePause(fixture, {});
      await mintRequest(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.VaultPaused,
        }
      );
    });

    it("should fail: when allowance is insufficient", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture, {
        addPaymentToken: {
          allowance: parseUnits("0.1"),
        },
      });

      await mintRequest(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.InsufficientAllowance,
        }
      );
    });

    it("should fail: when user`s balance is insufficient", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await transferToken(fixture, {
        to: fixture.regularAccounts[0].publicKey,
      });

      await mintRequest(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: CommonError.SplInsufficientFunds,
        }
      );
    });

    it("should fail: when deposit amount is < min_amount", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await updateVaultCommon(fixture, {
        minAmount: parseUnits("10"),
      });

      await mintRequest(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.LessThanMinAmount,
        }
      );
    });

    it("should fail: when deposit amount is < first_deposit_min_m_tokens", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await updateMinterVault(fixture, {
        firstDepositMinMTokens: parseUnits("10"),
      });

      await mintRequest(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.LessThanMinAmountFirstMint,
        }
      );
    });

    it("should fail: when token fee is 100%", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture, {
        addPaymentToken: {
          fee: parsePercent(100),
        },
      });

      await mintRequest(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.InvalidConvertAmount,
        }
      );
    });

    it("should fail: when green list enabled and user is not green listed", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await updateVaultCommon(fixture, {
        greenlistEnforced: true,
      });

      await mintRequest(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.NotGreenListed,
        }
      );
    });

    it("should fail: user is in the black list", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);

      await updateAccountAc(fixture, {
        blackListed: true,
      });

      await mintRequest(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.Blacklisted,
        }
      );
    });
  });

  describe("approve_mint_request", () => {
    it("should approve mint request", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture, {});
      await mintRequest(fixture, {}, {});

      await approveMintRequest(fixture, {});
    });

    it("when safe=true and new rate do not exceed allowed deviation", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture, {});
      await mintRequest(fixture, {}, {});

      await approveMintRequest(
        fixture,
        {
          isSafe: true,
          newRate: parseUnits("1.1"),
        },
        {},
        {
          tokensMinted: parseUnits("9"),
        }
      );
    });

    it("should fail: call from non-authority", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture, {});
      await mintRequest(fixture, {}, {});

      await approveMintRequest(
        fixture,
        {},
        {},
        {},
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        }
      );
    });

    it("should fail: when safe is passed and new rate exceeds allowed deviation", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture, {});
      await mintRequest(fixture, {}, {});

      await approveMintRequest(
        fixture,
        {
          isSafe: true,
          newRate: parseUnits("1.11"),
        },
        {},
        {},
        {
          revertedWith: VaultError.VariationToleranceExceeded,
        }
      );
    });
  });

  describe("reject_mint_request", () => {
    it("should reject mint request", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture);
      await mintRequest(fixture, {}, {});

      await rejectMintRequest(fixture, {});
    });

    it("should fail: call from non-authority", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonMintTest(fixture, {});
      await mintRequest(fixture, {}, {});

      await rejectMintRequest(
        fixture,
        {},
        {},
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        }
      );
    });
  });
});
