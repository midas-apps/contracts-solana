import * as anchor from "@coral-xyz/anchor";
import { dataFeedFixture } from "./fixture/dafa-feed.fixture";
import {
  DATA_FEED_PROGRAM_ID,
  DataFeedError,
} from "./constants/data-feed.constants";
import { DataFeedMode, fetchDataFeedState } from "./helpers/data-feed.helpers";
import {
  createNewFeed,
  createNewManualFeed,
  updateManualFeed,
} from "./testers/data-feed.testers";
import { vaultsFixture } from "./fixture/vaults.fixture";
import {
  VaultActionIds,
  VaultError,
  VAULTS_PROGRAM_ID,
} from "./constants/vaults.constants";
import {
  approveRedeemRequest,
  mintToken,
  mintPaymentTokenAndApprove,
  prepareCommonRedeemTest,
  redeemInstant,
  redeemRequest,
  rejectRedeemRequest,
  newRedeemerVault,
  updateRedeemerVault,
  transferToken,
} from "./testers/redeem-vault.testers";
import {
  approveMint,
  fromBN,
  parsePercent,
  parseUnits,
  timeTravel,
} from "./helpers/common.helpers";
import {
  getRedeemerVaultPda,
  getRedeemerVaultRedeemerPda,
} from "./helpers/vaults.helpers";
import { mintMToken } from "./testers/token-authority.testers";
import {
  addPaymentToken,
  newVaultCommon,
  updatePause,
  updatePauseInx,
  updateVaultCommon,
  updateVaultCommonAccount,
} from "./testers/common-vaults.testers";
import { CommonError, DAY, DEFAULT_PUBKEY } from "./constants/common.constants";
import { updateAccountAc } from "./testers/ac.testers";
import { Keypair } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

describe("redeemer-vault", () => {
  describe("initializing", () => {
    it("Should deploy program", async () => {
      const { vaultsProgram } = await vaultsFixture();
      expect(vaultsProgram.programId.equals(VAULTS_PROGRAM_ID)).toBe(true);
    });
  });

  describe("new_redeemer_vault", () => {
    it("call with default params", async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await newRedeemerVault(fixture, { commonVault });
    });

    it("should fail: call from non-authority", async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await newRedeemerVault(
        fixture,
        { commonVault },
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        }
      );
    });

    it("should fail: when fee is 101%", async () => {
      const fixture = await vaultsFixture();

      const commonVault = await newVaultCommon(fixture, {});
      await newRedeemerVault(
        fixture,
        { commonVault, fiatAdditionalFee: parsePercent(101) },
        {
          revertedWith: VaultError.InvalidFee,
        }
      );
    });
  });

  describe("update_redeemer_vault", () => {
    it("call with default params", async () => {
      const fixture = await vaultsFixture();

      await updateRedeemerVault(fixture, {});
    });

    it("should fail; call from non-authority", async () => {
      const fixture = await vaultsFixture();

      await updateRedeemerVault(
        fixture,
        {},
        {
          from: fixture.regularAccounts[0],
          revertedWith: CommonError.AccountIsNotInitialized,
        }
      );
    });

    it("should fail: when fee is 101%", async () => {
      const fixture = await vaultsFixture();

      await updateRedeemerVault(
        fixture,
        { fiatAdditionalFee: parsePercent(101) },
        {
          revertedWith: VaultError.InvalidFee,
        }
      );
    });
  });

  describe("redeem_instant", () => {
    it("should redeem instant", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);
      await redeemInstant(fixture, {}, {});
    });

    it("when green list enabled and user is in green list", async () => {
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

    it("when user is waived from fee", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);

      await updateVaultCommonAccount(
        fixture,
        {
          waivedFee: true,
        },
        {
          commonVault: fixture.redeemerCommonVault.publicKey,
        }
      );

      await redeemInstant(
        fixture,
        {},
        {},
        {
          fee: 0n,
          tokensReceived: 10,
        }
      );
    });

    it("when allowance is set to u128.max - it should not decrease", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);

      await redeemInstant(fixture, {});
    });

    it("when allowance is not set to u128.max - it should  decrease", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        addPaymentToken: {
          allowance: parseUnits("10"),
        },
      });

      const { stateAfter } = await redeemInstant(fixture, {});

      expect(fromBN(stateAfter.paymentTokenState.allowance)).toEqual(0n);
    });

    it("when allowance is not set to u128.max - it should  decrease, mToken price is 1.1$", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        addPaymentToken: {
          allowance: parseUnits("11"),
        },
        mintPaymentTokenAndApprove: {
          amountBase9: parseUnits("11"),
        },
      });

      await updateManualFeed(fixture, {
        price: parseUnits("1.1"),
      });

      const { stateAfter } = await redeemInstant(
        fixture,
        {},
        {},
        { tokensReceived: 10.89, fee: parseUnits("0.1") }
      );

      expect(fromBN(stateAfter.paymentTokenState.allowance)).toEqual(0n);
    });

    it("daily limit should decrease", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {});

      await updateVaultCommon(fixture, {
        instantDailyLimit: parseUnits("10"),
      });

      const { stateAfter } = await redeemInstant(fixture, {});

      expect(fromBN(stateAfter.commonVaultState.instantDailyLimitUsed)).toEqual(
        parseUnits("10")
      );
    });

    it("use all daily limit, then skip to next day and use all limit again", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        mintMToken: { amount: parseUnits("20") },
        mintPaymentTokenAndApprove: { amountBase9: parseUnits("20") },
      });

      await updateVaultCommon(fixture, {
        instantDailyLimit: parseUnits("10"),
        vaultCommon: fixture.redeemerCommonVault.publicKey,
      });

      const { stateAfter } = await redeemInstant(fixture, {});

      expect(fromBN(stateAfter.commonVaultState.instantDailyLimitUsed)).toEqual(
        parseUnits("10")
      );

      await timeTravel(fixture.context, DAY);

      const { stateAfter: stateAfterNextDay } = await redeemInstant(
        fixture,
        {}
      );

      expect(
        fromBN(stateAfterNextDay.commonVaultState.instantDailyLimitUsed)
      ).toEqual(parseUnits("10"));

      expect(stateAfterNextDay.commonVaultState.instantLastDay).toEqual(
        stateAfter.commonVaultState.instantLastDay + 1
      );
    });

    it("when min_amount is 10 but user is free from min amounts", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        mintMToken: { amount: parseUnits("20") },
        mintPaymentTokenAndApprove: { amountBase9: parseUnits("20") },
      });

      await updateVaultCommon(fixture, {
        minAmount: parseUnits("10"),
        vaultCommon: fixture.redeemerCommonVault.publicKey,
      });

      await updateVaultCommonAccount(
        fixture,
        {
          freeFromMinAmount: true,
        },
        {
          commonVault: fixture.redeemerCommonVault.publicKey,
        }
      );

      await redeemInstant(
        fixture,
        {
          amountMToken: parseUnits("9"),
          minReceiveAmount: parseUnits("8.91"),
        },
        {},
        {
          fee: parseUnits("0.09"),
          tokensReceived: 8.91,
        }
      );
    });

    it("redeem 100 mToken, when price of stable is 1.05$, mToken price is 5$, token fee 1%, instant fee 0%", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        mintMToken: { amount: parseUnits("100") },
        mintPaymentTokenAndApprove: { amountBase9: parseUnits("495") },
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

      await redeemInstant(
        fixture,
        {
          amountMToken: parseUnits("100"),
          minReceiveAmount: parseUnits("495"),
        },
        {},
        {
          fee: parseUnits("1"),
          tokensReceived: 495,
        }
      );
    });

    it("redeem 100 USDC, stable = false, price of payment token is 1.05$, mToken price is 5$, token fee 1%, instant fee 0%", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        addPaymentToken: {
          stable: false,
        },
        mintMToken: { amount: parseUnits("100") },
        mintPaymentTokenAndApprove: { amountBase9: parseUnits("471.428571") },
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

      await redeemInstant(
        fixture,
        {
          amountMToken: parseUnits("100"),
          minReceiveAmount: parseUnits("20"),
        },
        {},
        {
          fee: parseUnits("1"),
          tokensReceived: 471.428571, // (100 - 1%) * 5 . 1.05
        }
      );
    });

    it("when request function is paused", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);
      await updatePauseInx(
        fixture,
        {
          fnId: VaultActionIds.REDEEM_REQUEST,
        },
        {
          commonVault: fixture.redeemerCommonVault.publicKey,
        }
      );

      await redeemInstant(fixture, {}, {});
    });

    it("should fail: when amount is 0", async () => {
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
        }
      );
    });

    it("should fail: when payment token rate is 0", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        addPaymentToken: { stable: false },
      });
      await updateManualFeed(fixture, {
        price: 0n,
        baseFeed: fixture.paymentMints.usdc.feed.publicKey,
      });
      await redeemInstant(
        fixture,
        {},
        {},
        {},
        {
          // TODO: find a way to proxify errors
          revertedWith: DataFeedError.PriceIsLowerThanMin,
        }
      );
    });

    it("should fail: when function is paused", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);
      await updatePauseInx(
        fixture,
        {
          fnId: VaultActionIds.REDEEM_INSTANT,
        },
        {
          commonVault: fixture.redeemerCommonVault.publicKey,
        }
      );

      await redeemInstant(
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

      await prepareCommonRedeemTest(fixture);
      await updatePause(
        fixture,
        {},
        {
          commonVault: fixture.redeemerCommonVault.publicKey,
        }
      );
      await redeemInstant(
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

      await prepareCommonRedeemTest(fixture, {
        addPaymentToken: {
          allowance: parseUnits("0.1"),
        },
      });

      await redeemInstant(
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
        }
      );
    });

    it("should fail: when vault`s balance is insufficient", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        mintPaymentTokenAndApprove: {
          amountBase9: parseUnits("1"),
        },
      });

      await redeemInstant(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: CommonError.SplInsufficientFunds,
        }
      );
    });

    it("should fail: when redeem amount is < min_amount", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);

      await updateVaultCommon(fixture, {
        minAmount: parseUnits("10.01"),
        vaultCommon: fixture.redeemerCommonVault.publicKey,
      });

      await redeemInstant(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.LessThanMinAmount,
        }
      );
    });

    it("should fail: when daily limit is exceeded", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);

      await updateVaultCommon(fixture, {
        instantDailyLimit: parseUnits("9"),
        vaultCommon: fixture.redeemerCommonVault.publicKey,
      });

      await redeemInstant(
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

      await prepareCommonRedeemTest(fixture);

      await redeemInstant(
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
        }
      );
    });

    it("should fail: when green list enabled and user is not green listed", async () => {
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
        }
      );
    });

    it("should fail: user is in the black list", async () => {
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
        }
      );
    });
  });

  describe("redeem_request", () => {
    it("should redeem request", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);
      await redeemRequest(fixture, {}, {});
    });

    it("when green list enabled and user is in green list", async () => {
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

    it("when user is waived from fee", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);

      await updateVaultCommonAccount(
        fixture,
        {
          waivedFee: true,
        },
        {
          commonVault: fixture.redeemerCommonVault.publicKey,
        }
      );

      await redeemRequest(
        fixture,
        {},
        {},
        {
          fee: 0n,
        }
      );
    });

    it("allowance should not change after the request initiation", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);

      const { stateAfter, stateBefore } = await redeemRequest(fixture, {});

      expect(
        stateAfter.paymentTokenState.allowance.eq(
          stateBefore.paymentTokenState.allowance
        )
      ).toBe(true);
    });

    it("instant daily limit should not change", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {});

      await updateVaultCommon(fixture, {
        instantDailyLimit: parseUnits("10"),
      });

      const { stateAfter, stateBefore } = await redeemRequest(fixture, {});

      expect(
        stateAfter.commonVaultState.instantDailyLimitUsed.eq(
          stateBefore.commonVaultState.instantDailyLimitUsed
        )
      ).toBe(true);
    });

    it("when min_amount is 10 but user is free from min amounts", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        mintMToken: { amount: parseUnits("20") },
        mintPaymentTokenAndApprove: { amountBase9: parseUnits("20") },
      });

      await updateVaultCommon(fixture, {
        minAmount: parseUnits("10"),
        vaultCommon: fixture.redeemerCommonVault.publicKey,
      });

      await updateVaultCommonAccount(
        fixture,
        {
          freeFromMinAmount: true,
        },
        {
          commonVault: fixture.redeemerCommonVault.publicKey,
        }
      );

      await redeemRequest(
        fixture,
        {
          amountMToken: parseUnits("9"),
        },
        {},
        {
          fee: parseUnits("0.09"),
        }
      );
    });

    it("request redeem 100 mToken, when price of stable is 1.05$, mToken price is 5$, token fee 1%, instant fee 0%", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        mintMToken: { amount: parseUnits("100") },
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

      await redeemRequest(
        fixture,
        {
          amountMToken: parseUnits("100"),
        },
        {},
        {
          fee: parseUnits("1"),
        }
      );
    });

    it("request redeem 100 USDC, stable = false, price of payment token is 1.05$, mToken price is 5$, token fee 1%, instant fee 0%", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        addPaymentToken: {
          stable: false,
        },
        mintMToken: { amount: parseUnits("100") },
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

      await redeemRequest(
        fixture,
        {
          amountMToken: parseUnits("100"),
        },
        {},
        {
          fee: parseUnits("1"),
        }
      );
    });

    it("create 2 requests in the row", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        addPaymentToken: {
          stable: false,
        },
        mintMToken: { amount: parseUnits("100") },
      });

      await redeemRequest(fixture, {}, {});
      await redeemRequest(fixture, {}, {});
    });

    it("should fail: when amount is 0", async () => {
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
        }
      );
    });

    it("when allowance is insufficient it should not fail during request creation", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        addPaymentToken: {
          allowance: parseUnits("0.1"),
        },
      });

      await redeemRequest(fixture, {}, {});
    });

    it("when vault`s balance is insufficient it should not fail during request creation", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        mintPaymentTokenAndApprove: {
          amountBase9: parseUnits("1"),
        },
      });

      await redeemRequest(fixture, {}, {});
    });

    it("when instant function is paused", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);
      await updatePauseInx(
        fixture,
        {
          fnId: VaultActionIds.REDEEM_INSTANT,
        },
        {
          commonVault: fixture.redeemerCommonVault.publicKey,
        }
      );

      await redeemRequest(fixture, {}, {});
    });

    it("should fail: when payment token rate is 0", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        addPaymentToken: { stable: false },
      });
      await updateManualFeed(fixture, {
        price: 0n,
        baseFeed: fixture.paymentMints.usdc.feed.publicKey,
      });
      await redeemRequest(
        fixture,
        {},
        {},
        {},
        {
          // TODO: find a way to proxify errors
          revertedWith: DataFeedError.PriceIsLowerThanMin,
        }
      );
    });

    it("should fail: when function is paused", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);
      await updatePauseInx(
        fixture,
        {
          fnId: VaultActionIds.REDEEM_REQUEST,
        },
        {
          commonVault: fixture.redeemerCommonVault.publicKey,
        }
      );

      await redeemRequest(
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

      await prepareCommonRedeemTest(fixture);
      await updatePause(
        fixture,
        {},
        {
          commonVault: fixture.redeemerCommonVault.publicKey,
        }
      );
      await redeemRequest(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.VaultPaused,
        }
      );
    });

    it("should fail: when user`s balance is insufficient", async () => {
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
        }
      );
    });

    it("should fail: when redeem amount is < min_amount", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture);

      await updateVaultCommon(fixture, {
        minAmount: parseUnits("10.01"),
        vaultCommon: fixture.redeemerCommonVault.publicKey,
      });

      await redeemRequest(
        fixture,
        {},
        {},
        {},
        {
          revertedWith: VaultError.LessThanMinAmount,
        }
      );
    });

    it("should fail: when green list enabled and user is not green listed", async () => {
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
        }
      );
    });

    it("should fail: user is in the black list", async () => {
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
        }
      );
    });
  });

  describe("redeem_request_fiat", () => {
    it("should create redeem request fiat", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, { isFiat: true });
      await redeemRequest(fixture, { isFiat: true }, {});
    });

    it("when greenlist is enforced and user is in greenlist", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, { isFiat: true });
      await updateVaultCommon(fixture, {
        vaultCommon: fixture.redeemerCommonVault.publicKey,
        greenlistEnforced: true,
      });
      await redeemRequest(fixture, { isFiat: true }, {});
    });

    it("should fail: when greenlist not enforced and user is not greenlisted", async () => {
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
        { revertedWith: VaultError.NotGreenListed }
      );
    });

    it("should fail: when fn is paused", async () => {
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
        }
      );

      await redeemRequest(
        fixture,
        { isFiat: true },
        {},
        {},
        { revertedWith: VaultError.VaultInxPaused }
      );
    });

    it("should fail: when vault is paused", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        isFiat: true,
      });

      await updatePause(
        fixture,
        {},
        {
          commonVault: fixture.redeemerCommonVault.publicKey,
        }
      );

      await redeemRequest(
        fixture,
        { isFiat: true },
        {},
        {},
        { revertedWith: VaultError.VaultPaused }
      );
    });
  });

  describe("approve_redeem_request_fiat", () => {
    it("should approve redeem request fiat", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        isFiat: true,
      });
      await redeemRequest(fixture, { isFiat: true }, {});
      await approveRedeemRequest(fixture, { isFiat: true }, {});
    });

    it("should fail: try to approve non-fiat request", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {});
      await addPaymentToken(
        fixture,
        {
          mint: DEFAULT_PUBKEY,
        },
        {
          commonVault: fixture.redeemerCommonVault.publicKey,
        }
      );

      await redeemRequest(fixture, {}, {});
      await approveRedeemRequest(
        fixture,
        { isFiat: true },
        {},
        {},
        {
          revertedWith: VaultError.InvalidPaymentMint,
        }
      );
    });
  });

  describe("approve_redeem_request", () => {
    it("should approve redeem request", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        mintPaymentTokenAndApprove: {
          to: getRedeemerVaultRedeemerPda(
            fixture.redeemerCommonVault.publicKey
          ),
        },
      });
      await redeemRequest(fixture, {}, {});
      await approveRedeemRequest(fixture, {}, {});
    });

    it("when allowance is finite and it should decrease after approve", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        addPaymentToken: {
          allowance: parseUnits("9.9"),
        },
        mintPaymentTokenAndApprove: {
          to: getRedeemerVaultRedeemerPda(
            fixture.redeemerCommonVault.publicKey
          ),
        },
      });
      await redeemRequest(fixture, {}, {});
      const { stateAfter } = await approveRedeemRequest(
        fixture,
        {},
        {},
        { tokensReceived: 9.9 }
      );

      expect(fromBN(stateAfter.paymentTokenState.allowance)).toEqual(0n);
    });

    it("when allowance is finite and it should decrease after approve and new rate is 1.1$", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        addPaymentToken: {
          allowance: parseUnits("10.89"),
        },
        mintPaymentTokenAndApprove: {
          to: getRedeemerVaultRedeemerPda(
            fixture.redeemerCommonVault.publicKey
          ),
          amountBase9: parseUnits("10.89"),
        },
      });
      await redeemRequest(fixture, {}, {});
      const { stateAfter } = await approveRedeemRequest(
        fixture,
        {
          newRate: parseUnits("1.1"),
        },
        {},
        { tokensReceived: 10.89 }
      );

      expect(fromBN(stateAfter.paymentTokenState.allowance)).toEqual(0n);
    });

    it("when safe=true and new rate do not exceed allowed deviation", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {
        mintPaymentTokenAndApprove: {
          to: getRedeemerVaultRedeemerPda(
            fixture.redeemerCommonVault.publicKey
          ),
          amountBase9: parseUnits("10.89"),
        },
      });
      await redeemRequest(fixture, {}, {});

      await approveRedeemRequest(
        fixture,
        {
          isSafe: true,
          newRate: parseUnits("1.1"),
        },
        {},
        {
          tokensReceived: 10.89,
        }
      );
    });

    it("should fail: call from non-authority", async () => {
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
        }
      );
    });

    it("should fail: when safe is passed and new rate exceeds allowed deviation", async () => {
      const fixture = await vaultsFixture();
      await prepareCommonRedeemTest(fixture, {});
      await redeemRequest(fixture, {}, {});

      await approveRedeemRequest(
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

  describe("reject_redeem_request", () => {
    it("should reject redeem request", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, {});
      await redeemRequest(fixture, {}, {});
      await rejectRedeemRequest(fixture, {}, {});
    });

    it("should reject redeem fiat request", async () => {
      const fixture = await vaultsFixture();

      await prepareCommonRedeemTest(fixture, { isFiat: true });
      await redeemRequest(fixture, { isFiat: true }, {});
      await rejectRedeemRequest(fixture, {}, {});
    });

    it("should fail: call from non-authority", async () => {
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
        }
      );
    });
  });
});
