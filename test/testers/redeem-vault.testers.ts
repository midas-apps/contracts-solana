import {
  createMintToInstruction,
  createTransferCheckedInstruction,
  getMint,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';

import { DEFAULT_PUBKEY, MAX_U128, ONE } from '../constants/common.constants';
import { VAULT_AC_ROLES } from '../constants/vaults.constants';
import { VaultsFixtureReturnType } from '../fixture/vaults.fixture';
import { getAccountAcRoleStatePda, getAccountAcStatePda } from '../helpers/ac.helpers';
import {
  approveMintInstruction,
  expectTxNotReverted,
  expectTxReverted,
  formatUnits,
  fromBN,
  getBalance,
  getOrCreateAta,
  OptionalCommonParams,
  parseUnits,
  processTransaction,
  toBN,
  toBNNullable,
} from '../helpers/common.helpers';
import { fetchDataFeedState, fetchManualFeedState } from '../helpers/data-feed.helpers';
import {
  fetchPaymentMintState,
  fetchRedeemerVaultRequestState,
  fetchRedeemerVaultState,
  fetchVaultCommonAccountState,
  fetchVaultCommonState,
  getCommonVaultAccountStatePda,
  getPaymentMintStatePda,
  getRedeemerVaultPda,
  getRedeemerVaultRequestPda,
  PaymentMint,
} from '../helpers/vaults.helpers';

import { newAccountAc, updateAccountAc } from './ac.testers';
import { addPaymentToken, newVaultCommonAccount } from './common-vaults.testers';
import { mintMToken } from './token-authority.testers';

type CommonRedeemVaultParams = VaultsFixtureReturnType;

export const newRedeemerVault = async (
  fixture: CommonRedeemVaultParams,
  {
    commonVault,
    fiatFlatFee,
    minFiatRedeemAmount,
    requestRedeemer,
  }: {
    commonVault?: PublicKey;
    minFiatRedeemAmount?: bigint;
    fiatFlatFee?: bigint;
    requestRedeemer?: PublicKey;
  },

  opt?: OptionalCommonParams,
) => {
  const { vaultsProgram, authority: owner, context, redeemerCommonVault } = fixture;
  const from = opt?.from ?? owner;

  commonVault ??= redeemerCommonVault.publicKey;
  fiatFlatFee ??= parseUnits('1');
  minFiatRedeemAmount ??= parseUnits('10');
  requestRedeemer ??= fixture.requestRedeemer.publicKey;

  const fetchState = async () => {
    const common = await fetchVaultCommonState(vaultsProgram, commonVault);
    const redeemer = await fetchRedeemerVaultState(
      vaultsProgram,
      getRedeemerVaultPda(commonVault),
      true,
    );

    return {
      common,
      redeemer,
    };
  };

  const stateBefore = await fetchState();

  const tx = await vaultsProgram.methods
    .newRedeemerVault(requestRedeemer, toBN(minFiatRedeemAmount), toBN(fiatFlatFee))
    .accountsPartial({
      authority: from.publicKey,
      vaultCommon: commonVault,
      authorityAcRole: getAccountAcRoleStatePda(
        stateBefore.common.acRole,
        from.publicKey,
        VAULT_AC_ROLES.VAULT_ADMIN,
      ),
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState();

  expect(stateBefore.redeemer).toEqual(null);
  expect(stateAfter.redeemer).not.toEqual(null);

  expect(stateAfter.redeemer.commonVault.equals(commonVault)).toBe(true);
  expect(fromBN(stateAfter.redeemer.minFiatRedeemAmount)).toEqual(minFiatRedeemAmount);

  expect(fromBN(stateAfter.redeemer.fiatFlatFee)).toEqual(fiatFlatFee);
};

export const updateRedeemerVault = async (
  fixture: CommonRedeemVaultParams,
  {
    commonVault,
    fiatFlatFee,
    minFiatRedeemAmount,
    requestRedeemer,
  }: {
    commonVault?: PublicKey;
    minFiatRedeemAmount?: bigint;
    requestRedeemer?: PublicKey;
    fiatFlatFee?: bigint;
  },

  opt?: OptionalCommonParams,
) => {
  const { vaultsProgram, authority: owner, context, redeemerCommonVault } = fixture;
  const from = opt?.from ?? owner;

  commonVault ??= redeemerCommonVault.publicKey;
  fiatFlatFee ??= null;
  minFiatRedeemAmount ??= null;
  requestRedeemer ??= null;
  const fetchState = async () => {
    const common = await fetchVaultCommonState(vaultsProgram, commonVault);
    const redeemer = await fetchRedeemerVaultState(vaultsProgram, getRedeemerVaultPda(commonVault));

    return {
      common,
      redeemer,
    };
  };

  const stateBefore = await fetchState();

  const tx = await vaultsProgram.methods
    .updateRedeemerVault(
      requestRedeemer,
      toBNNullable(minFiatRedeemAmount),
      toBNNullable(fiatFlatFee),
    )
    .accountsPartial({
      authority: from.publicKey,
      vaultCommon: commonVault,
      authorityAcRole: getAccountAcRoleStatePda(
        stateBefore.common.acRole,
        from.publicKey,
        VAULT_AC_ROLES.VAULT_ADMIN,
      ),
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState();

  expect(stateAfter.redeemer.commonVault.equals(commonVault)).toBe(true);

  if (minFiatRedeemAmount !== null) {
    expect(fromBN(stateAfter.redeemer.minFiatRedeemAmount)).toEqual(minFiatRedeemAmount);
  }

  if (fiatFlatFee !== null) {
    expect(fromBN(stateAfter.redeemer.fiatFlatFee)).toEqual(fiatFlatFee);
  }

  if (requestRedeemer !== null) {
    expect(stateAfter.redeemer.requestRedeemer.equals(requestRedeemer)).toBe(true);
  }
};

export const redeemInstant = async (
  fixture: CommonRedeemVaultParams,
  {
    amountMToken,
    minReceiveAmount,
    paymentMint,
  }: {
    paymentMint?: PaymentMint;
    amountMToken?: bigint;
    minReceiveAmount?: bigint;
  },
  accounts?: {
    ac?: PublicKey;
    commonVault?: PublicKey;
  },
  expected?: {
    tokensReceived?: number;
    fee?: bigint;
  },
  opt?: OptionalCommonParams,
) => {
  const { dataFeedProgram, vaultsProgram, authority: owner, context, connection } = fixture;

  amountMToken ??= parseUnits('10');
  minReceiveAmount ??= parseUnits('9');
  paymentMint ??= fixture.paymentMints.usdc;

  expected ??= {
    fee: parseUnits('0.1'),
    tokensReceived: 9.9,
  };

  const expectedTokensReceivedParsed = parseUnits(
    (expected?.tokensReceived ?? 0n).toString(),
    paymentMint.decimals,
  );

  const baseAccounts = {
    vaultCommon: accounts?.commonVault ?? fixture.redeemerCommonVault.publicKey,
    ac: accounts?.ac ?? fixture.ac.publicKey,
  };

  const from = opt?.from ?? owner;

  const fetchState = async () => {
    const redeemerVaultState = await fetchRedeemerVaultState(
      vaultsProgram,
      getRedeemerVaultPda(baseAccounts.vaultCommon),
    );

    const commonVaultState = await fetchVaultCommonState(vaultsProgram, baseAccounts.vaultCommon);

    const commonVaultAccountState = await fetchVaultCommonAccountState(
      vaultsProgram,
      getCommonVaultAccountStatePda(baseAccounts.vaultCommon, from.publicKey),
    );

    const mMintFeed = await fetchDataFeedState(dataFeedProgram, commonVaultState.mMintFeed);

    const mMintFeedManual = await fetchManualFeedState(dataFeedProgram, mMintFeed.underlyingFeed);

    const paymentTokenState = await fetchPaymentMintState(
      vaultsProgram,
      getPaymentMintStatePda(baseAccounts.vaultCommon, paymentMint.mint),
    );

    const paymentTokenFeed = await fetchDataFeedState(dataFeedProgram, paymentTokenState.dataFeed);

    const paymentTokenFeedManual = await fetchManualFeedState(
      dataFeedProgram,
      paymentTokenFeed.underlyingFeed,
    );

    const balanceFromPaymentMint = await getBalance(connection, from.publicKey, paymentMint.mint);

    const balanceVaultPaymentMint = await getBalance(
      connection,
      getRedeemerVaultPda(baseAccounts.vaultCommon),
      paymentMint.mint,
    );
    const balanceFromMMint = await getBalance(
      connection,
      from.publicKey,
      commonVaultState.mMint,
      TOKEN_2022_PROGRAM_ID,
    );

    const balanceFeeReceiverMMint = await getBalance(
      connection,
      commonVaultState.feeReceiver,
      commonVaultState.mMint,
      TOKEN_2022_PROGRAM_ID,
    );

    const mTokenState = await getMint(
      connection,
      commonVaultState.mMint,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    return {
      commonVaultState,
      mMintFeed,
      paymentTokenState,
      paymentTokenFeed,
      balanceFromPaymentMint,
      commonVaultAccountState,
      balanceFeeReceiverMMint,
      mTokenState,
      balanceFromMMint,
      redeemerVaultState,
      balanceVaultPaymentMint,
      mMintFeedManual,
      paymentTokenFeedManual,
    };
  };

  const stateBefore = await fetchState();

  const tx = await vaultsProgram.methods
    .redeemInstant(toBN(amountMToken), toBN(minReceiveAmount))
    .accountsPartial({
      ...baseAccounts,
      mMint: stateBefore.commonVaultState.mMint,
      mMintFeed: stateBefore.mMintFeed.underlyingFeed,
      mMintTokenProgram: TOKEN_2022_PROGRAM_ID,
      mMintDataFeed: stateBefore.commonVaultState.mMintFeed,
      signer: from.publicKey,
      paymentMint: paymentMint.mint,
      paymentMintDataFeed: stateBefore.paymentTokenState.dataFeed,
      paymentMintFeed: stateBefore.paymentTokenFeed.underlyingFeed,
      paymentMintTokenProgram: TOKEN_PROGRAM_ID,
      accountAc: getAccountAcStatePda(baseAccounts.ac, from.publicKey),
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState();

  const paymentMintPrice = stateBefore.paymentTokenState.stable
    ? ONE
    : fromBN(stateBefore.paymentTokenFeedManual.price);

  const mTokenInPaymentMint =
    (amountMToken * fromBN(stateBefore.mMintFeedManual.price)) / paymentMintPrice;

  if (fromBN(stateBefore.paymentTokenState.allowance) !== MAX_U128) {
    expect(fromBN(stateAfter.paymentTokenState.allowance)).toEqual(
      fromBN(stateBefore.paymentTokenState.allowance) - mTokenInPaymentMint,
    );
  }

  const clock = await context.banksClient.getClock();
  const currentDay = clock.unixTimestamp / 86400n;

  let expectedNewDailyLimitUsed = amountMToken;

  if (BigInt(stateBefore.commonVaultState.instantLastDay) === currentDay) {
    expectedNewDailyLimitUsed += fromBN(stateBefore.commonVaultState.instantDailyLimitUsed);
  }

  expect(fromBN(stateAfter.commonVaultState.instantDailyLimitUsed)).toEqual(
    expectedNewDailyLimitUsed,
  );

  expect(stateAfter.commonVaultAccountState.freeFromMinFirstMint).toEqual(false);

  expect(stateAfter.balanceFromPaymentMint).toEqual(
    stateBefore.balanceFromPaymentMint + expectedTokensReceivedParsed,
  );

  expect(stateAfter.balanceFromMMint).toEqual(stateBefore.balanceFromMMint - amountMToken);

  expect(stateAfter.mTokenState.supply).toEqual(
    stateBefore.mTokenState.supply - (amountMToken - expected.fee),
  );

  expect(stateAfter.balanceFeeReceiverMMint).toEqual(
    stateBefore.balanceFeeReceiverMMint + (expected.fee ?? 0n),
  );

  expect(stateAfter.balanceVaultPaymentMint).toEqual(
    stateBefore.balanceVaultPaymentMint - expectedTokensReceivedParsed,
  );

  return { stateAfter, clock };
};

export const redeemRequest = async (
  fixture: CommonRedeemVaultParams,
  {
    amountMToken,
    paymentMint,
    isFiat,
  }: {
    paymentMint?: PaymentMint;
    amountMToken?: bigint;
    isFiat?: boolean;
  },
  accounts?: {
    minterVault?: PublicKey;
    ac?: PublicKey;
    commonVault?: PublicKey;
  },
  expected?: {
    fee?: bigint;
  },
  opt?: OptionalCommonParams,
) => {
  const { dataFeedProgram, vaultsProgram, authority: owner, context, connection } = fixture;

  expected ??= {
    fee: parseUnits('0.1'),
  };

  amountMToken ??= parseUnits('10');
  paymentMint ??= fixture.paymentMints.usdc;
  isFiat ??= false;

  const baseAccounts = {
    vaultCommon: accounts?.commonVault ?? fixture.redeemerCommonVault.publicKey,
    ac: accounts?.ac ?? fixture.ac.publicKey,
  };

  const from = opt?.from ?? owner;

  const fetchState = async (reqId?: bigint) => {
    const redeemerVaultState = await fetchRedeemerVaultState(
      vaultsProgram,
      getRedeemerVaultPda(baseAccounts.vaultCommon),
    );

    const commonVaultState = await fetchVaultCommonState(vaultsProgram, baseAccounts.vaultCommon);

    const requestState = await fetchRedeemerVaultRequestState(
      vaultsProgram,
      getRedeemerVaultRequestPda(
        getRedeemerVaultPda(baseAccounts.vaultCommon),
        reqId ?? fromBN(commonVaultState.requestsCount),
      ),
      true,
    );

    const commonVaultAccountState = await fetchVaultCommonAccountState(
      vaultsProgram,
      getCommonVaultAccountStatePda(baseAccounts.vaultCommon, from.publicKey),
    );

    const mMintFeed = await fetchDataFeedState(dataFeedProgram, commonVaultState.mMintFeed);

    const mMintFeedManual = await fetchManualFeedState(dataFeedProgram, mMintFeed.underlyingFeed);

    const paymentTokenState = await fetchPaymentMintState(
      vaultsProgram,
      getPaymentMintStatePda(baseAccounts.vaultCommon, !isFiat ? paymentMint.mint : DEFAULT_PUBKEY),
    );

    const paymentTokenFeed = !isFiat
      ? await fetchDataFeedState(dataFeedProgram, paymentTokenState.dataFeed)
      : null;

    const paymentTokenFeedManual = !isFiat
      ? await fetchManualFeedState(dataFeedProgram, paymentTokenFeed.underlyingFeed)
      : null;

    const balanceFromPaymentMint = await getBalance(connection, from.publicKey, paymentMint.mint);

    const balanceVaultPaymentMint = await getBalance(
      connection,
      getRedeemerVaultPda(baseAccounts.vaultCommon),
      paymentMint.mint,
    );

    const balanceFromMMint = await getBalance(
      connection,
      from.publicKey,
      commonVaultState.mMint,
      TOKEN_2022_PROGRAM_ID,
    );

    const balanceFeeReceiverMMint = await getBalance(
      connection,
      commonVaultState.feeReceiver,
      commonVaultState.mMint,
      TOKEN_2022_PROGRAM_ID,
    );

    const mTokenState = await getMint(
      connection,
      commonVaultState.mMint,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    return {
      redeemerVaultState,
      commonVaultState,
      mMintFeed,
      paymentTokenState,
      paymentTokenFeed,
      requestState,
      commonVaultAccountState,
      balanceFromPaymentMint,
      balanceVaultPaymentMint,
      balanceFromMMint,
      balanceFeeReceiverMMint,
      mTokenState,
      mMintFeedManual,
      paymentTokenFeedManual,
    };
  };

  const stateBefore = await fetchState();

  const tx = isFiat
    ? await vaultsProgram.methods
        .redeemRequestFiat(toBN(amountMToken))
        .accountsPartial({
          ...baseAccounts,
          mMintFeed: stateBefore.mMintFeed.underlyingFeed,
          mMintDataFeed: stateBefore.commonVaultState.mMintFeed,
          signer: from.publicKey,
          redeemRequest: getRedeemerVaultRequestPda(
            getRedeemerVaultPda(baseAccounts.vaultCommon),
            fromBN(stateBefore.commonVaultState.requestsCount),
          ),
          mMint: stateBefore.commonVaultState.mMint,
          mMintTokenProgram: TOKEN_2022_PROGRAM_ID,
          accountAc: getAccountAcStatePda(baseAccounts.ac, from.publicKey),
        })
        .transaction()
    : await vaultsProgram.methods
        .redeemRequest(toBN(amountMToken))
        .accountsPartial({
          ...baseAccounts,

          mMintFeed: stateBefore.mMintFeed.underlyingFeed,
          mMintDataFeed: stateBefore.commonVaultState.mMintFeed,
          signer: from.publicKey,
          paymentMint: paymentMint.mint,
          paymentMintDataFeed: stateBefore.paymentTokenState.dataFeed,
          paymentMintFeed: stateBefore.paymentTokenFeed.underlyingFeed,
          paymentMintTokenProgram: TOKEN_PROGRAM_ID,
          redeemRequest: getRedeemerVaultRequestPda(
            getRedeemerVaultPda(baseAccounts.vaultCommon),
            fromBN(stateBefore.commonVaultState.requestsCount),
          ),
          mMint: stateBefore.commonVaultState.mMint,
          mMintTokenProgram: TOKEN_2022_PROGRAM_ID,
          accountAc: getAccountAcStatePda(baseAccounts.ac, from.publicKey),
        })
        .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState(fromBN(stateBefore.commonVaultState.requestsCount));

  expect(stateAfter.requestState).not.toEqual(null);

  expect(fromBN(stateAfter.paymentTokenState.allowance)).toEqual(
    fromBN(stateBefore.paymentTokenState.allowance),
  );

  expect(fromBN(stateAfter.commonVaultState.instantDailyLimitUsed)).toEqual(
    fromBN(stateBefore.commonVaultState.instantDailyLimitUsed),
  );

  expect(stateAfter.commonVaultAccountState.freeFromMinFirstMint).toEqual(false);

  expect(stateAfter.balanceFromPaymentMint).toEqual(stateBefore.balanceFromPaymentMint);

  expect(stateAfter.balanceFromMMint).toEqual(stateBefore.balanceFromMMint - amountMToken);

  expect(stateAfter.mTokenState.supply).toEqual(stateBefore.mTokenState.supply);

  expect(stateAfter.balanceFeeReceiverMMint).toEqual(
    stateBefore.balanceFeeReceiverMMint + (expected.fee ?? 0n),
  );

  expect(stateAfter.balanceVaultPaymentMint).toEqual(stateBefore.balanceVaultPaymentMint);

  expect(fromBN(stateAfter.commonVaultState.requestsCount)).toEqual(
    fromBN(stateBefore.commonVaultState.requestsCount) + 1n,
  );

  expect(stateAfter.requestState.user.equals(from.publicKey)).toBe(true);
  expect(fromBN(stateAfter.requestState.mTokenAmount)).toEqual(amountMToken - (expected.fee ?? 0n));
  expect(fromBN(stateAfter.requestState.mTokenRate)).toEqual(
    fromBN(stateBefore.mMintFeedManual.price),
  );
  expect(fromBN(stateAfter.requestState.paymentMintRate)).toEqual(
    stateBefore.paymentTokenState.stable || isFiat
      ? ONE
      : fromBN(stateBefore.paymentTokenFeedManual.price),
  );
  expect(
    stateAfter.requestState.paymentMint.equals(isFiat ? DEFAULT_PUBKEY : paymentMint.mint),
  ).toBe(true);

  return { stateAfter, stateBefore };
};

export const approveRedeemRequest = async (
  fixture: CommonRedeemVaultParams,
  {
    newRate,
    isSafe,
    requestId,
    isFiat,
  }: {
    requestId?: bigint;
    newRate?: bigint;
    isSafe?: boolean;
    isFiat?: boolean;
  },
  accounts?: {
    commonVault?: PublicKey;
  },
  expected?: {
    tokensReceived?: number;
  },
  opt?: OptionalCommonParams,
) => {
  const { dataFeedProgram, vaultsProgram, authority: owner, context, connection } = fixture;

  expected ??= {
    tokensReceived: 9.9,
  };

  isFiat ??= false;
  newRate ??= parseUnits('1');
  isSafe ??= false;
  requestId ??= 0n;

  const baseAccounts = {
    vaultCommon: accounts?.commonVault ?? fixture.redeemerCommonVault.publicKey,
  };

  const from = opt?.from ?? owner;

  // eslint-disable-next-line prefer-const
  let requestStateCached: Awaited<ReturnType<typeof fetchRedeemerVaultRequestState>>;

  const fetchState = async (_user?: PublicKey) => {
    const requestState = await fetchRedeemerVaultRequestState(
      vaultsProgram,
      getRedeemerVaultRequestPda(getRedeemerVaultPda(baseAccounts.vaultCommon), requestId),
      true,
    );

    const state = requestState ?? requestStateCached;

    const redeemerVaultState = await fetchRedeemerVaultState(
      vaultsProgram,
      getRedeemerVaultPda(baseAccounts.vaultCommon),
    );

    const commonVaultState = await fetchVaultCommonState(vaultsProgram, baseAccounts.vaultCommon);

    const commonVaultAccountState = await fetchVaultCommonAccountState(
      vaultsProgram,
      getCommonVaultAccountStatePda(baseAccounts.vaultCommon, state.user),
    );

    const mMintFeed = await fetchDataFeedState(dataFeedProgram, commonVaultState.mMintFeed);

    const paymentTokenState = await fetchPaymentMintState(
      vaultsProgram,
      getPaymentMintStatePda(
        baseAccounts.vaultCommon,
        !isFiat ? state.paymentMint : DEFAULT_PUBKEY,
      ),
    );

    const paymentTokenFeed = !isFiat
      ? await fetchDataFeedState(dataFeedProgram, paymentTokenState.dataFeed)
      : null;

    const balanceUserPaymentMint = await getBalance(connection, state.user, state.paymentMint);

    const balanceFromPaymentMint = await getBalance(connection, from.publicKey, state.paymentMint);

    const balanceVaultPaymentMint = await getBalance(
      connection,
      getRedeemerVaultPda(baseAccounts.vaultCommon),
      state.paymentMint,
    );

    const balanceRedeemerPaymentMint = await getBalance(
      connection,
      redeemerVaultState.requestRedeemer,
      state.paymentMint,
    );

    const balanceUserMMint = await getBalance(
      connection,
      state.user,
      commonVaultState.mMint,
      TOKEN_2022_PROGRAM_ID,
    );

    const balanceFeeReceiverMMint = await getBalance(
      connection,
      commonVaultState.feeReceiver,
      commonVaultState.mMint,
      TOKEN_2022_PROGRAM_ID,
    );

    const mTokenState = await getMint(
      connection,
      commonVaultState.mMint,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    const paymentToken = !isFiat ? await getMint(connection, state.paymentMint) : null;

    return {
      redeemerVaultState,
      commonVaultState,
      requestState,
      paymentToken,
      commonVaultAccountState,
      mMintFeed,
      paymentTokenFeed,
      balanceUserPaymentMint,
      balanceFromPaymentMint,
      balanceVaultPaymentMint,
      balanceRedeemerPaymentMint,
      balanceUserMMint,
      balanceFeeReceiverMMint,
      mTokenState,
      paymentTokenState,
    };
  };

  const stateBefore = await fetchState();
  requestStateCached = stateBefore.requestState;

  const expectedTokensReceivedParsed = !isFiat
    ? parseUnits((expected?.tokensReceived ?? 0n).toString(), stateBefore.paymentToken.decimals)
    : 0n;

  expect(stateBefore.requestState).not.toEqual(null);

  const user = stateBefore.requestState.user;

  const tx = isFiat
    ? await vaultsProgram.methods
        .approveRedeemRequestFiat(toBN(requestId), toBN(newRate), isSafe)
        .accountsPartial({
          ...baseAccounts,
          authority: from.publicKey,
          redeemRequest: getRedeemerVaultRequestPda(
            getRedeemerVaultPda(baseAccounts.vaultCommon),
            requestId,
          ),
          userAccount: user,
          mMint: stateBefore.commonVaultState.mMint,
          mMintTokenProgram: TOKEN_2022_PROGRAM_ID,
          authorityAcRole: getAccountAcRoleStatePda(
            stateBefore.commonVaultState.acRole,
            from.publicKey,
            VAULT_AC_ROLES.VAULT_ADMIN,
          ),
        })
        .transaction()
    : await vaultsProgram.methods
        .approveRedeemRequest(toBN(requestId), toBN(newRate), isSafe)
        .accountsPartial({
          ...baseAccounts,
          authority: from.publicKey,
          redeemRequest: getRedeemerVaultRequestPda(
            getRedeemerVaultPda(baseAccounts.vaultCommon),
            requestId,
          ),
          userAccount: user,
          mMint: stateBefore.commonVaultState.mMint,
          mMintTokenProgram: TOKEN_2022_PROGRAM_ID,
          paymentMint: stateBefore.requestState.paymentMint,
          paymentMintTokenProgram: TOKEN_PROGRAM_ID,
          requestRedeemer: stateBefore.redeemerVaultState.requestRedeemer,
          // requestRedeemer: getRedeemerVaultRedeemerPda(
          //   baseAccounts.vaultCommon
          // ),
          authorityAcRole: getAccountAcRoleStatePda(
            stateBefore.commonVaultState.acRole,
            from.publicKey,
            VAULT_AC_ROLES.VAULT_ADMIN,
          ),
        })
        .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState(user);

  expect(stateAfter.requestState).toEqual(null);

  if (fromBN(stateBefore.paymentTokenState.allowance) !== MAX_U128) {
    expect(fromBN(stateAfter.paymentTokenState.allowance)).toEqual(
      fromBN(stateBefore.paymentTokenState.allowance) -
        parseUnits((expected.tokensReceived ?? 0n).toString()),
    );
  }

  expect(fromBN(stateAfter.commonVaultState.instantDailyLimitUsed)).toEqual(
    fromBN(stateBefore.commonVaultState.instantDailyLimitUsed),
  );

  expect(stateAfter.commonVaultAccountState.freeFromMinFirstMint).toEqual(false);

  if (!from.publicKey.equals(user)) {
    expect(stateAfter.balanceFromPaymentMint).toEqual(stateBefore.balanceFromPaymentMint);
  }

  expect(stateAfter.balanceUserPaymentMint).toEqual(
    stateBefore.balanceUserPaymentMint + expectedTokensReceivedParsed,
  );

  expect(stateAfter.balanceUserMMint).toEqual(stateBefore.balanceUserMMint);

  expect(stateAfter.mTokenState.supply).toEqual(
    stateBefore.mTokenState.supply - fromBN(stateBefore.requestState.mTokenAmount),
  );

  expect(stateAfter.balanceFeeReceiverMMint).toEqual(stateBefore.balanceFeeReceiverMMint);

  expect(stateAfter.balanceVaultPaymentMint).toEqual(stateBefore.balanceVaultPaymentMint);

  expect(stateAfter.balanceRedeemerPaymentMint).toEqual(
    stateBefore.balanceRedeemerPaymentMint - expectedTokensReceivedParsed,
  );

  return { stateAfter };
};

export const rejectRedeemRequest = async (
  fixture: CommonRedeemVaultParams,
  {
    requestId,
  }: {
    requestId?: bigint;
  },
  accounts?: {
    commonVault?: PublicKey;
  },
  opt?: OptionalCommonParams,
) => {
  const { vaultsProgram, authority: owner, context } = fixture;

  requestId ??= 0n;

  const baseAccounts = {
    vaultCommon: accounts?.commonVault ?? fixture.redeemerCommonVault.publicKey,
  };

  const from = opt?.from ?? owner;

  const fetchState = async (_user?: PublicKey) => {
    const redeemerVaultState = await fetchRedeemerVaultState(
      vaultsProgram,
      getRedeemerVaultPda(baseAccounts.vaultCommon),
    );

    const commonVaultState = await fetchVaultCommonState(vaultsProgram, baseAccounts.vaultCommon);

    const requestState = await fetchRedeemerVaultRequestState(
      vaultsProgram,
      getRedeemerVaultRequestPda(getRedeemerVaultPda(baseAccounts.vaultCommon), requestId),
      true,
    );

    // const balanceFromMToken = await getBalance(
    //   connection,
    //   user ?? requestState.user,
    //   commonVaultState.mMint,
    //   TOKEN_2022_PROGRAM_ID
    // );

    return {
      redeemerVaultState,
      commonVaultState,
      requestState,
      // balanceFromMToken,
    };
  };

  const stateBefore = await fetchState();

  const user = stateBefore.requestState.user;

  const tx = await vaultsProgram.methods
    .rejectRedeemRequest(toBN(requestId))
    .accountsPartial({
      ...baseAccounts,
      authority: from.publicKey,
      redeemRequest: getRedeemerVaultRequestPda(
        getRedeemerVaultPda(baseAccounts.vaultCommon),
        requestId,
      ),
      userAccount: user,
      authorityAcRole: getAccountAcRoleStatePda(
        stateBefore.commonVaultState.acRole,
        from.publicKey,
        VAULT_AC_ROLES.VAULT_ADMIN,
      ),
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState(user);

  expect(stateAfter.requestState).toEqual(null);
};

export const mintToken = async (
  fixture: CommonRedeemVaultParams,
  {
    mint,
    to,
    amountBase9,
    tokenProgram,
  }: {
    mint?: PaymentMint;
    to?: PublicKey;
    amountBase9?: bigint;
    tokenProgram?: PublicKey;
  },
  opt?: OptionalCommonParams,
) => {
  mint ??= fixture.paymentMints.usdc;
  to ??= fixture.authority.publicKey;
  amountBase9 ??= parseUnits('10');

  const amount = parseUnits(formatUnits(amountBase9).toString(), mint.decimals);

  const from = opt?.from ?? fixture.authority;

  const { ata } = await getOrCreateAta(
    fixture.context,
    fixture.provider.connection,
    mint.mint,
    to,
    from,
    tokenProgram,
  );

  await expectTxNotReverted(
    fixture.context,

    new Transaction().add(
      createMintToInstruction(mint.mint, ata, from.publicKey, amount, undefined, tokenProgram),
    ),
    [from],
  );
};

export const transferToken = async (
  fixture: CommonRedeemVaultParams,
  {
    mint,
    to,
    amount,
    tokenProgram,
  }: {
    mint?: PaymentMint;
    to?: PublicKey;
    amount?: bigint;
    tokenProgram?: PublicKey;
  },
  opt?: OptionalCommonParams,
) => {
  mint ??= fixture.paymentMints.usdc;
  to ??= fixture.authority.publicKey;

  const from = opt?.from ?? fixture.authority;

  amount ??= await getBalance(fixture.connection, from.publicKey, mint.mint, tokenProgram);

  const { ata: ataFrom } = await getOrCreateAta(
    fixture.context,
    fixture.provider.connection,
    mint.mint,
    from.publicKey,
    from,
    tokenProgram,
  );

  const { ata: ataTo } = await getOrCreateAta(
    fixture.context,
    fixture.provider.connection,
    mint.mint,
    to,
    from,
    tokenProgram,
  );

  await expectTxNotReverted(
    fixture.context,

    new Transaction().add(
      createTransferCheckedInstruction(
        ataFrom,
        mint.mint,
        ataTo,
        from.publicKey,
        amount,
        mint.decimals,
        [],
        tokenProgram,
      ),
    ),
    [from],
  );
};

export const mintPaymentTokenAndApprove = async (
  fixture: CommonRedeemVaultParams,
  {
    mint,
    to,
    amountBase9,
    approveTo,
    doApprove,
    approveFrom,
  }: {
    mint?: PaymentMint;
    approveTo?: PublicKey;
    to?: PublicKey;
    amountBase9?: bigint;
    approveFrom?: Keypair;
    doApprove?: boolean;
  },
) => {
  mint ??= fixture.paymentMints.usdc;
  to ??= getRedeemerVaultPda(fixture.redeemerCommonVault.publicKey);

  doApprove ??= true;

  amountBase9 ??= parseUnits('10');
  approveTo ??= getRedeemerVaultPda(fixture.redeemerCommonVault.publicKey);
  approveFrom ??= fixture.requestRedeemer;

  const amount = parseUnits(formatUnits(amountBase9).toString(), mint.decimals);

  const from = fixture.authority;

  const { ata } = await getOrCreateAta(
    fixture.context,
    fixture.provider.connection,
    mint.mint,
    to,
    from,
  );

  const tx = new Transaction().add(createMintToInstruction(mint.mint, ata, from.publicKey, amount));

  const signers = [from];

  if (doApprove) {
    tx.add(approveMintInstruction(mint.mint, approveFrom, approveTo, amount));
    signers.push(approveFrom);
  }

  await processTransaction(fixture.context, tx, signers);
};

export const prepareCommonRedeemTest = async (
  fixture: CommonRedeemVaultParams,
  params: {
    isFiat?: boolean;
    addToGreenList?: boolean;
    addPaymentToken?: {
      stable?: boolean;
      allowance?: bigint;
      fee?: bigint;
    };
    mintMToken?: {
      amount?: bigint;
    };
    mintPaymentTokenAndApprove?: {
      to?: PublicKey;
      amountBase9?: bigint;
      doApprove?: boolean;
    };
  } = {},
) => {
  const addToGreenList = params.addToGreenList ?? params.isFiat ?? false;

  await addPaymentToken(
    fixture,
    {
      mint: params.isFiat ? DEFAULT_PUBKEY : undefined,
      ...(params.addPaymentToken ?? {}),
    },
    {
      commonVault: fixture.redeemerCommonVault.publicKey,
    },
  );

  await newVaultCommonAccount(fixture, {}, { commonVault: fixture.redeemerCommonVault.publicKey });
  await newAccountAc(fixture, {});

  await mintMToken(fixture, params?.mintMToken ?? {});

  if (!params.isFiat) {
    await mintPaymentTokenAndApprove(fixture, params?.mintPaymentTokenAndApprove ?? {});
  } else if (addToGreenList) {
    await updateAccountAc(fixture, {
      greenListed: true,
    });
  }
};
