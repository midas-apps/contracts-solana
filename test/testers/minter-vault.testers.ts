import { getMint, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { expect } from 'vitest';

import { MAX_U64, MAX_U128, ONE } from '../constants/common.constants';
import { TOKEN_AUTHORITY_ROLES } from '../constants/token-authority.constants';
import { VAULT_AC_ROLES } from '../constants/vaults.constants';
import { VaultsFixtureReturnType } from '../fixture/vaults.fixture';
import { getAccountAcRoleStatePda, getAccountAcStatePda } from '../helpers/ac.helpers';
import {
  expectTxNotReverted,
  expectTxReverted,
  fromBN,
  getBalance,
  OptionalCommonParams,
  parseUnits,
  toBN,
  toBNNullable,
} from '../helpers/common.helpers';
import { fetchDataFeedState, fetchManualFeedState } from '../helpers/data-feed.helpers';
import { fetchTokenAuthorityState, getTokenAuthorityPda } from '../helpers/token-authority.helpers';
import {
  fetchMinterVaultRequestState,
  fetchMinterVaultState,
  fetchPaymentMintState,
  fetchVaultCommonAccountState,
  fetchVaultCommonState,
  getCommonVaultAccountStatePda,
  getMinterVaultPda,
  getMinterVaultRequestPda,
  getPaymentMintStatePda,
  PaymentMint,
} from '../helpers/vaults.helpers';

import { newAccountAc } from './ac.testers';
import { addPaymentToken, newVaultCommonAccount } from './common-vaults.testers';

type CommonMinterVaultParams = VaultsFixtureReturnType;

export const newMinterVault = async (
  fixture: CommonMinterVaultParams,
  {
    commonVault,
    tokenAuthority,
    firstDepositMinMTokens,
    maxSupplyCap,
  }: {
    commonVault?: PublicKey;
    tokenAuthority?: PublicKey;
    firstDepositMinMTokens?: bigint;
    maxSupplyCap?: bigint;
  },

  opt?: OptionalCommonParams,
) => {
  const {
    vaultsProgram,
    authority: owner,
    context,
    mTBillMinterAuthoritySeed,
    minterCommonVault,
  } = fixture;
  const from = opt?.from ?? owner;

  commonVault ??= minterCommonVault.publicKey;
  tokenAuthority ??= getTokenAuthorityPda(mTBillMinterAuthoritySeed);
  firstDepositMinMTokens ??= parseUnits('10');
  maxSupplyCap ??= MAX_U64; // u64::MAX = no cap

  const fetchState = async () => {
    const common = await fetchVaultCommonState(vaultsProgram, commonVault);
    const minter = await fetchMinterVaultState(vaultsProgram, getMinterVaultPda(commonVault), true);

    return {
      common,
      minter,
    };
  };

  const stateBefore = await fetchState();

  const tx = await vaultsProgram.methods
    .newMinterVault(toBN(firstDepositMinMTokens), toBN(maxSupplyCap))
    .accountsPartial({
      authority: from.publicKey,
      vaultCommon: commonVault,
      tokenAuthority: tokenAuthority,
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

  expect(stateBefore.minter).toEqual(null);
  expect(stateAfter.minter).not.toEqual(null);

  expect(stateAfter.minter.commonVault.equals(commonVault)).toBe(true);
  expect(stateAfter.minter.mintAuthorityPda.equals(tokenAuthority)).toBe(true);
  expect(fromBN(stateAfter.minter.firstDepositMinMTokens)).toEqual(firstDepositMinMTokens);
  expect(fromBN(stateAfter.minter.maxSupplyCap)).toEqual(maxSupplyCap);
};

export const updateMinterVault = async (
  fixture: CommonMinterVaultParams,
  {
    commonVault,
    tokenAuthority,
    firstDepositMinMTokens,
    maxSupplyCap,
  }: {
    commonVault?: PublicKey;
    tokenAuthority?: PublicKey;
    firstDepositMinMTokens?: bigint;
    maxSupplyCap?: bigint;
  },

  opt?: OptionalCommonParams,
) => {
  const { vaultsProgram, authority: owner, context, minterCommonVault } = fixture;
  const from = opt?.from ?? owner;

  commonVault ??= minterCommonVault.publicKey;
  tokenAuthority ??= null;
  firstDepositMinMTokens ??= null;
  maxSupplyCap ??= null;

  const fetchState = async () => {
    const common = await fetchVaultCommonState(vaultsProgram, commonVault);
    const minter = await fetchMinterVaultState(vaultsProgram, getMinterVaultPda(commonVault));

    return {
      common,
      minter,
    };
  };

  const stateBefore = await fetchState();

  const tx = await vaultsProgram.methods
    .updateMinterVault(
      toBNNullable(firstDepositMinMTokens),
      tokenAuthority,
      toBNNullable(maxSupplyCap),
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

  expect(stateAfter.minter.commonVault.equals(commonVault)).toBe(true);

  if (tokenAuthority !== null) {
    expect(stateAfter.minter.mintAuthorityPda.equals(tokenAuthority)).toBe(true);
  }

  if (firstDepositMinMTokens !== null) {
    expect(fromBN(stateAfter.minter.firstDepositMinMTokens)).toEqual(firstDepositMinMTokens);
  }

  if (maxSupplyCap !== null) {
    expect(fromBN(stateAfter.minter.maxSupplyCap)).toEqual(maxSupplyCap);
  }
};

export const mintInstant = async (
  fixture: CommonMinterVaultParams,
  {
    amountToken,
    minReceiveAmount,
    referrerId,
    paymentMint,
  }: {
    paymentMint?: PaymentMint;
    amountToken?: number;
    minReceiveAmount?: bigint;
    referrerId?: number[];
  },
  accounts?: {
    minterVault?: PublicKey;
    ac?: PublicKey;
    commonVault?: PublicKey;
  },
  expected?: {
    tokensMinted?: bigint;
    fee?: number;
  },
  opt?: OptionalCommonParams,
) => {
  const {
    dataFeedProgram,
    vaultsProgram,
    tokenAuthorityProgram,
    authority: owner,
    context,
    connection,
  } = fixture;

  amountToken ??= 10;
  minReceiveAmount ??= parseUnits('9');
  referrerId ??= new Array(32).fill(0);
  paymentMint ??= fixture.paymentMints.usdc;

  const expectedWasUndefined = expected === undefined;
  expected ??= {
    fee: 0.1,
    tokensMinted: parseUnits('9.9'),
  };

  const amountTokenParsed = parseUnits(amountToken.toString(), paymentMint.decimals);

  const baseAccounts = {
    vaultCommon: accounts?.commonVault ?? fixture.minterCommonVault.publicKey,
    ac: accounts?.ac ?? fixture.ac.publicKey,
  };

  const from = opt?.from ?? owner;

  const fetchState = async () => {
    const minterVaultState = await fetchMinterVaultState(
      vaultsProgram,
      getMinterVaultPda(baseAccounts.vaultCommon),
    );

    const mintAuthorityState = await fetchTokenAuthorityState(
      tokenAuthorityProgram,
      minterVaultState.mintAuthorityPda,
    );

    const commonVaultState = await fetchVaultCommonState(vaultsProgram, baseAccounts.vaultCommon);

    const commonVaultAccountState = await fetchVaultCommonAccountState(
      vaultsProgram,
      getCommonVaultAccountStatePda(baseAccounts.vaultCommon, from.publicKey),
    );

    const mMintFeed = await fetchDataFeedState(dataFeedProgram, commonVaultState.mMintFeed);

    const paymentTokenState = await fetchPaymentMintState(
      vaultsProgram,
      getPaymentMintStatePda(baseAccounts.vaultCommon, paymentMint.mint),
    );

    const paymentTokenFeed = await fetchDataFeedState(dataFeedProgram, paymentTokenState.dataFeed);

    const balanceFromPaymentMint = await getBalance(connection, from.publicKey, paymentMint.mint);

    const balanceTokensReceiverPaymentMint = await getBalance(
      connection,
      commonVaultState.tokensReceiver,
      paymentMint.mint,
    );

    const balanceFeeReceiverPaymentMint = await getBalance(
      connection,
      commonVaultState.feeReceiver,
      paymentMint.mint,
    );

    const balanceFromMToken = await getBalance(
      connection,
      from.publicKey,
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
      minterVaultState,
      commonVaultState,
      mMintFeed,
      mintAuthorityState,
      paymentTokenState,
      paymentTokenFeed,
      balanceFromPaymentMint,
      balanceTokensReceiverPaymentMint,
      balanceFeeReceiverPaymentMint,
      balanceFromMToken,
      mTokenState,
      commonVaultAccountState,
    };
  };

  const stateBefore = await fetchState();

  const tx = await vaultsProgram.methods
    .mintInstant(toBN(amountTokenParsed), toBN(minReceiveAmount), referrerId)
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
      tokenAuthority: stateBefore.minterVaultState.mintAuthorityPda,
      accountAc: getAccountAcStatePda(baseAccounts.ac, from.publicKey),
      vaultMinterRole: getAccountAcRoleStatePda(
        stateBefore.mintAuthorityState.acRole,
        getMinterVaultPda(baseAccounts.vaultCommon),
        TOKEN_AUTHORITY_ROLES.M_MINTER,
      ),
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState();

  if (fromBN(stateBefore.paymentTokenState.allowance) !== MAX_U128) {
    expect(fromBN(stateAfter.paymentTokenState.allowance)).toEqual(
      fromBN(stateBefore.paymentTokenState.allowance) - parseUnits(amountToken.toString()),
    );
  }

  const clock = await context.banksClient.getClock();
  const currentDay = clock.unixTimestamp / 86400n;

  const actualTokensMinted = expectedWasUndefined
    ? stateAfter.balanceFromMToken - stateBefore.balanceFromMToken
    : (expected?.tokensMinted ?? 0n);

  let expectedNewDailyLimitUsed = actualTokensMinted;

  if (BigInt(stateBefore.commonVaultState.instantLastDay) === currentDay) {
    expectedNewDailyLimitUsed += fromBN(stateBefore.commonVaultState.instantDailyLimitUsed);
  }

  expect(fromBN(stateAfter.commonVaultState.instantDailyLimitUsed)).toEqual(
    expectedNewDailyLimitUsed,
  );

  let expectedFreeFromMinFirstMint = true;

  if (stateBefore.commonVaultAccountState.freeFromMinAmount) {
    expectedFreeFromMinFirstMint = stateBefore.commonVaultAccountState.freeFromMinFirstMint;
  }

  expect(stateAfter.commonVaultAccountState.freeFromMinFirstMint).toEqual(
    expectedFreeFromMinFirstMint,
  );

  expect(stateAfter.balanceFromPaymentMint).toEqual(
    stateBefore.balanceFromPaymentMint - amountTokenParsed,
  );

  expect(stateAfter.balanceFromMToken).toEqual(stateBefore.balanceFromMToken + actualTokensMinted);

  expect(stateAfter.mTokenState.supply).toEqual(
    stateBefore.mTokenState.supply + actualTokensMinted,
  );

  expect(stateAfter.balanceFeeReceiverPaymentMint).toEqual(
    stateBefore.balanceFeeReceiverPaymentMint +
    parseUnits((expected?.fee ?? 0).toString(), paymentMint.decimals),
  );

  expect(stateAfter.balanceTokensReceiverPaymentMint).toEqual(
    stateBefore.balanceTokensReceiverPaymentMint +
    parseUnits((amountToken - (expected?.fee ?? 0)).toString(), paymentMint.decimals),
  );

  return { stateAfter, clock };
};

export const mintRequest = async (
  fixture: CommonMinterVaultParams,
  {
    amountToken,
    referrerId,
    paymentMint,
  }: {
    paymentMint?: PaymentMint;
    amountToken?: number;
    referrerId?: number[];
  },
  accounts?: {
    minterVault?: PublicKey;
    ac?: PublicKey;
    commonVault?: PublicKey;
  },
  expected?: {
    fee?: number;
  },
  opt?: OptionalCommonParams,
) => {
  const { dataFeedProgram, vaultsProgram, authority: owner, context, connection } = fixture;

  amountToken ??= 10;
  referrerId ??= new Array(32).fill(0);
  paymentMint ??= fixture.paymentMints.usdc;

  const amountTokenParsed = parseUnits(amountToken.toString(), paymentMint.decimals);

  expected ??= {
    fee: 0.1,
  };

  const baseAccounts = {
    vaultCommon: accounts?.commonVault ?? fixture.minterCommonVault.publicKey,
    ac: accounts?.ac ?? fixture.ac.publicKey,
  };

  const from = opt?.from ?? owner;

  const fetchState = async (reqId?: bigint) => {
    const commonVaultAccountState = await fetchVaultCommonAccountState(
      vaultsProgram,
      getCommonVaultAccountStatePda(baseAccounts.vaultCommon, from.publicKey),
    );

    const minterVaultState = await fetchMinterVaultState(
      vaultsProgram,
      getMinterVaultPda(baseAccounts.vaultCommon),
    );

    const commonVaultState = await fetchVaultCommonState(vaultsProgram, baseAccounts.vaultCommon);

    const commonVaultRequestState = await fetchMinterVaultRequestState(
      vaultsProgram,
      getMinterVaultRequestPda(
        getMinterVaultPda(baseAccounts.vaultCommon),
        reqId ?? fromBN(commonVaultState.requestsCount),
      ),
      true,
    );

    const paymentTokenState = await fetchPaymentMintState(
      vaultsProgram,
      getPaymentMintStatePda(baseAccounts.vaultCommon, paymentMint.mint),
    );

    const mMintFeed = await fetchDataFeedState(dataFeedProgram, commonVaultState.mMintFeed);

    const mMintManualFeed = await fetchManualFeedState(dataFeedProgram, mMintFeed.underlyingFeed);

    const paymentTokenFeed = await fetchDataFeedState(dataFeedProgram, paymentTokenState.dataFeed);

    const paymentTokenManualFeed = await fetchManualFeedState(
      dataFeedProgram,
      paymentTokenFeed.underlyingFeed,
    );
    const balanceFromPaymentMint = await getBalance(connection, from.publicKey, paymentMint.mint);

    const balanceTokensReceiverPaymentMint = await getBalance(
      connection,
      commonVaultState.tokensReceiver,
      paymentMint.mint,
    );

    const balanceFeeReceiverPaymentMint = await getBalance(
      connection,
      commonVaultState.feeReceiver,
      paymentMint.mint,
    );

    const balanceFromMToken = await getBalance(
      connection,
      from.publicKey,
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
      minterVaultState,
      commonVaultState,
      mMintFeed,
      paymentTokenState,
      paymentTokenFeed,
      commonVaultRequestState,
      balanceFromPaymentMint,
      balanceTokensReceiverPaymentMint,
      balanceFeeReceiverPaymentMint,
      balanceFromMToken,
      commonVaultAccountState,
      mTokenState,
      mMintManualFeed,
      paymentTokenManualFeed,
    };
  };

  const stateBefore = await fetchState();

  const tx = await vaultsProgram.methods
    .mintRequest(toBN(amountTokenParsed), referrerId)
    .accountsPartial({
      ...baseAccounts,

      mMintFeed: stateBefore.mMintFeed.underlyingFeed,
      mMintDataFeed: stateBefore.commonVaultState.mMintFeed,
      signer: from.publicKey,
      paymentMint: paymentMint.mint,
      paymentMintDataFeed: stateBefore.paymentTokenState.dataFeed,
      paymentMintFeed: stateBefore.paymentTokenFeed.underlyingFeed,
      paymentMintTokenProgram: TOKEN_PROGRAM_ID,
      mintRequest: getMinterVaultRequestPda(
        getMinterVaultPda(baseAccounts.vaultCommon),
        fromBN(stateBefore.commonVaultState.requestsCount),
      ),
      accountAc: getAccountAcStatePda(baseAccounts.ac, from.publicKey),
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState(fromBN(stateBefore.commonVaultState.requestsCount));

  expect(fromBN(stateAfter.commonVaultState.requestsCount)).toEqual(
    fromBN(stateBefore.commonVaultState.requestsCount) + 1n,
  );

  expect(stateAfter.commonVaultRequestState).not.toEqual(null);
  expect(stateAfter.commonVaultRequestState.paymentMint.equals(paymentMint.mint)).toBe(true);

  expect(stateAfter.commonVaultRequestState.user.equals(from.publicKey)).toBe(true);

  const paymentPrice = stateBefore.paymentTokenState.stable
    ? ONE
    : fromBN(stateBefore.paymentTokenManualFeed.price);
  expect(fromBN(stateAfter.commonVaultRequestState.mMintRate)).toBe(
    fromBN(stateBefore.mMintManualFeed.price),
  );

  expect(fromBN(stateAfter.commonVaultRequestState.depositedUsd)).toBe(
    (paymentPrice * parseUnits(amountToken.toString())) / ONE,
  );

  expect(fromBN(stateAfter.commonVaultRequestState.depositedUsdWoFees)).toBe(
    (paymentPrice * parseUnits((amountToken - (expected?.fee ?? 0)).toString())) / ONE,
  );

  if (fromBN(stateBefore.paymentTokenState.allowance) !== MAX_U128) {
    expect(fromBN(stateAfter.paymentTokenState.allowance)).toEqual(
      fromBN(stateBefore.paymentTokenState.allowance) - parseUnits(amountToken.toString()),
    );
  }

  let expectedFreeFromMinFirstMint = true;

  if (stateBefore.commonVaultAccountState.freeFromMinAmount) {
    expectedFreeFromMinFirstMint = stateBefore.commonVaultAccountState.freeFromMinFirstMint;
  }

  expect(stateAfter.commonVaultAccountState.freeFromMinFirstMint).toEqual(
    expectedFreeFromMinFirstMint,
  );

  expect(stateAfter.balanceFromPaymentMint).toEqual(
    stateBefore.balanceFromPaymentMint - amountTokenParsed,
  );

  expect(stateAfter.balanceFromMToken).toEqual(stateBefore.balanceFromMToken);

  expect(stateAfter.mTokenState.supply).toEqual(stateBefore.mTokenState.supply);

  expect(stateAfter.balanceFeeReceiverPaymentMint).toEqual(
    stateBefore.balanceFeeReceiverPaymentMint +
    parseUnits((expected?.fee ?? 0).toString(), paymentMint.decimals),
  );

  expect(stateAfter.balanceTokensReceiverPaymentMint).toEqual(
    stateBefore.balanceTokensReceiverPaymentMint +
    parseUnits((amountToken - (expected?.fee ?? 0)).toString(), paymentMint.decimals),
  );

  return { stateAfter };
};

export const approveMintRequest = async (
  fixture: CommonMinterVaultParams,
  {
    newRate,
    isSafe,
    requestId,
    skipOnSupplyCapExceeded,
  }: {
    requestId?: bigint;
    newRate?: bigint;
    isSafe?: boolean;
    skipOnSupplyCapExceeded?: boolean;
  },
  accounts?: {
    commonVault?: PublicKey;
  },
  expected?: {
    tokensMinted?: bigint;
    expectSkipped?: boolean;
  },
  opt?: OptionalCommonParams,
) => {
  const {
    dataFeedProgram,
    vaultsProgram,
    tokenAuthorityProgram,
    authority: owner,
    context,
    connection,
  } = fixture;

  newRate ??= parseUnits('1');
  isSafe ??= false;
  requestId ??= 0n;
  skipOnSupplyCapExceeded ??= false;

  expected ??= {
    tokensMinted: parseUnits('9.9'),
  };

  const expectSkipped = expected?.expectSkipped ?? false;

  const baseAccounts = {
    vaultCommon: accounts?.commonVault ?? fixture.minterCommonVault.publicKey,
  };

  const from = opt?.from ?? owner;

  // eslint-disable-next-line prefer-const
  let requestStateCached: Awaited<ReturnType<typeof fetchMinterVaultRequestState>>;

  const fetchState = async (_user?: PublicKey) => {
    const minterVaultState = await fetchMinterVaultState(
      vaultsProgram,
      getMinterVaultPda(baseAccounts.vaultCommon),
    );
    const mintAuthorityState = await fetchTokenAuthorityState(
      tokenAuthorityProgram,
      minterVaultState.mintAuthorityPda,
    );

    const commonVaultState = await fetchVaultCommonState(vaultsProgram, baseAccounts.vaultCommon);

    const requestState = await fetchMinterVaultRequestState(
      vaultsProgram,
      getMinterVaultRequestPda(getMinterVaultPda(baseAccounts.vaultCommon), requestId),
      true,
    );

    const state = requestState ?? requestStateCached;
    const commonVaultAccountState = await fetchVaultCommonAccountState(
      vaultsProgram,
      getCommonVaultAccountStatePda(baseAccounts.vaultCommon, state.user),
    );

    const mMintFeed = await fetchDataFeedState(dataFeedProgram, commonVaultState.mMintFeed);

    const paymentTokenState = await fetchPaymentMintState(
      vaultsProgram,
      getPaymentMintStatePda(baseAccounts.vaultCommon, state.paymentMint),
    );

    const paymentTokenFeed = await fetchDataFeedState(dataFeedProgram, paymentTokenState.dataFeed);

    const balanceUserPaymentMint = await getBalance(connection, state.user, state.paymentMint);

    const balanceTokensReceiverPaymentMint = await getBalance(
      connection,
      commonVaultState.tokensReceiver,
      state.paymentMint,
    );

    const balanceFeeReceiverPaymentMint = await getBalance(
      connection,
      commonVaultState.feeReceiver,
      state.paymentMint,
    );

    const balanceUserMToken = await getBalance(
      connection,
      state.user,
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
      minterVaultState,
      commonVaultState,
      requestState,
      balanceUserMToken,
      mintAuthorityState,
      commonVaultAccountState,
      mMintFeed,
      paymentTokenFeed,
      balanceUserPaymentMint,
      balanceTokensReceiverPaymentMint,
      balanceFeeReceiverPaymentMint,
      mTokenState,
      paymentTokenState,
    };
  };

  const stateBefore = await fetchState();
  requestStateCached = stateBefore.requestState;

  const user = stateBefore.requestState.user;

  const tx = await vaultsProgram.methods
    .approveMintRequest(toBN(requestId), toBN(newRate), isSafe, skipOnSupplyCapExceeded)
    .accountsPartial({
      ...baseAccounts,
      authority: from.publicKey,
      mintRequest: getMinterVaultRequestPda(getMinterVaultPda(baseAccounts.vaultCommon), requestId),
      tokenAuthority: stateBefore.minterVaultState.mintAuthorityPda,
      userAccount: user,
      mMint: stateBefore.commonVaultState.mMint,
      mMintTokenProgram: TOKEN_2022_PROGRAM_ID,
      authorityAcRole: getAccountAcRoleStatePda(
        stateBefore.commonVaultState.acRole,
        from.publicKey,
        VAULT_AC_ROLES.VAULT_ADMIN,
      ),
      vaultMinterRole: getAccountAcRoleStatePda(
        stateBefore.mintAuthorityState.acRole,
        getMinterVaultPda(baseAccounts.vaultCommon),
        TOKEN_AUTHORITY_ROLES.M_MINTER,
      ),
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  // When expectSkipped is true, the operation was silently skipped - don't check state changes
  if (expectSkipped) {
    return;
  }

  const stateAfter = await fetchState(user);

  expect(stateAfter.requestState).toEqual(null);

  expect(fromBN(stateAfter.paymentTokenState.allowance)).toEqual(
    fromBN(stateBefore.paymentTokenState.allowance),
  );

  expect(fromBN(stateAfter.commonVaultState.instantDailyLimitUsed)).toEqual(
    fromBN(stateAfter.commonVaultState.instantDailyLimitUsed),
  );

  expect(stateAfter.commonVaultAccountState.freeFromMinFirstMint).toEqual(
    stateAfter.commonVaultAccountState.freeFromMinFirstMint,
  );

  expect(stateAfter.balanceUserPaymentMint).toEqual(stateBefore.balanceUserPaymentMint);

  expect(stateAfter.balanceUserMToken).toEqual(
    stateBefore.balanceUserMToken + (expected?.tokensMinted ?? 0n),
  );

  expect(stateAfter.mTokenState.supply).toEqual(
    stateBefore.mTokenState.supply + (expected?.tokensMinted ?? 0n),
  );

  expect(stateAfter.balanceFeeReceiverPaymentMint).toEqual(
    stateBefore.balanceFeeReceiverPaymentMint,
  );

  expect(stateAfter.balanceTokensReceiverPaymentMint).toEqual(
    stateBefore.balanceTokensReceiverPaymentMint,
  );

  return { stateAfter };
};

export const safeApproveMintRequestAtCurrentRate = async (
  fixture: CommonMinterVaultParams,
  {
    requestId,
    skipOnSupplyCapExceeded,
  }: {
    requestId?: bigint;
    skipOnSupplyCapExceeded?: boolean;
  },
  accounts?: {
    commonVault?: PublicKey;
  },
  expected?: {
    tokensMinted?: bigint;
  },
  opt?: OptionalCommonParams,
) => {
  const {
    dataFeedProgram,
    vaultsProgram,
    tokenAuthorityProgram,
    authority: owner,
    context,
    connection,
  } = fixture;

  requestId ??= 0n;
  skipOnSupplyCapExceeded ??= false;

  expected ??= {
    tokensMinted: parseUnits('9.9'),
  };

  const baseAccounts = {
    vaultCommon: accounts?.commonVault ?? fixture.minterCommonVault.publicKey,
  };

  const from = opt?.from ?? owner;

  // eslint-disable-next-line prefer-const
  let requestStateCached: Awaited<ReturnType<typeof fetchMinterVaultRequestState>>;

  const fetchState = async (_user?: PublicKey) => {
    const minterVaultState = await fetchMinterVaultState(
      vaultsProgram,
      getMinterVaultPda(baseAccounts.vaultCommon),
    );
    const mintAuthorityState = await fetchTokenAuthorityState(
      tokenAuthorityProgram,
      minterVaultState.mintAuthorityPda,
    );

    const commonVaultState = await fetchVaultCommonState(vaultsProgram, baseAccounts.vaultCommon);

    const requestState = await fetchMinterVaultRequestState(
      vaultsProgram,
      getMinterVaultRequestPda(getMinterVaultPda(baseAccounts.vaultCommon), requestId),
      true,
    );

    const state = requestState ?? requestStateCached;
    const commonVaultAccountState = await fetchVaultCommonAccountState(
      vaultsProgram,
      getCommonVaultAccountStatePda(baseAccounts.vaultCommon, state.user),
    );

    const mMintFeed = await fetchDataFeedState(dataFeedProgram, commonVaultState.mMintFeed);

    const paymentTokenState = await fetchPaymentMintState(
      vaultsProgram,
      getPaymentMintStatePda(baseAccounts.vaultCommon, state.paymentMint),
    );

    const paymentTokenFeed = await fetchDataFeedState(dataFeedProgram, paymentTokenState.dataFeed);

    const balanceUserPaymentMint = await getBalance(connection, state.user, state.paymentMint);

    const balanceTokensReceiverPaymentMint = await getBalance(
      connection,
      commonVaultState.tokensReceiver,
      state.paymentMint,
    );

    const balanceFeeReceiverPaymentMint = await getBalance(
      connection,
      commonVaultState.feeReceiver,
      state.paymentMint,
    );

    const balanceUserMToken = await getBalance(
      connection,
      state.user,
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
      minterVaultState,
      commonVaultState,
      requestState,
      balanceUserMToken,
      mintAuthorityState,
      commonVaultAccountState,
      mMintFeed,
      paymentTokenFeed,
      balanceUserPaymentMint,
      balanceTokensReceiverPaymentMint,
      balanceFeeReceiverPaymentMint,
      mTokenState,
      paymentTokenState,
    };
  };

  const stateBefore = await fetchState();
  requestStateCached = stateBefore.requestState;

  const user = stateBefore.requestState.user;

  const tx = await vaultsProgram.methods
    .safeApproveMintRequestAtCurrentRate(toBN(requestId), skipOnSupplyCapExceeded)
    .accountsPartial({
      ...baseAccounts,
      authority: from.publicKey,
      mintRequest: getMinterVaultRequestPda(getMinterVaultPda(baseAccounts.vaultCommon), requestId),
      tokenAuthority: stateBefore.minterVaultState.mintAuthorityPda,
      userAccount: user,
      mMint: stateBefore.commonVaultState.mMint,
      mMintFeed: stateBefore.mMintFeed.underlyingFeed,
      mMintDataFeed: stateBefore.commonVaultState.mMintFeed,
      mMintTokenProgram: TOKEN_2022_PROGRAM_ID,
      authorityAcRole: getAccountAcRoleStatePda(
        stateBefore.commonVaultState.acRole,
        from.publicKey,
        VAULT_AC_ROLES.VAULT_ADMIN,
      ),
      vaultMinterRole: getAccountAcRoleStatePda(
        stateBefore.mintAuthorityState.acRole,
        getMinterVaultPda(baseAccounts.vaultCommon),
        TOKEN_AUTHORITY_ROLES.M_MINTER,
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

  expect(fromBN(stateAfter.paymentTokenState.allowance)).toEqual(
    fromBN(stateBefore.paymentTokenState.allowance),
  );

  expect(fromBN(stateAfter.commonVaultState.instantDailyLimitUsed)).toEqual(
    fromBN(stateAfter.commonVaultState.instantDailyLimitUsed),
  );

  expect(stateAfter.commonVaultAccountState.freeFromMinFirstMint).toEqual(
    stateAfter.commonVaultAccountState.freeFromMinFirstMint,
  );

  expect(stateAfter.balanceUserPaymentMint).toEqual(stateBefore.balanceUserPaymentMint);

  expect(stateAfter.balanceUserMToken).toEqual(
    stateBefore.balanceUserMToken + (expected?.tokensMinted ?? 0n),
  );

  expect(stateAfter.mTokenState.supply).toEqual(
    stateBefore.mTokenState.supply + (expected?.tokensMinted ?? 0n),
  );

  expect(stateAfter.balanceFeeReceiverPaymentMint).toEqual(
    stateBefore.balanceFeeReceiverPaymentMint,
  );

  expect(stateAfter.balanceTokensReceiverPaymentMint).toEqual(
    stateBefore.balanceTokensReceiverPaymentMint,
  );

  return { stateAfter };
};

export const safeApproveMintRequestAtRequestRate = async (
  fixture: CommonMinterVaultParams,
  {
    requestId,
    skipOnSupplyCapExceeded,
  }: {
    requestId?: bigint;
    skipOnSupplyCapExceeded?: boolean;
  },
  accounts?: {
    commonVault?: PublicKey;
  },
  expected?: {
    tokensMinted?: bigint;
  },
  opt?: OptionalCommonParams,
) => {
  const {
    dataFeedProgram,
    vaultsProgram,
    tokenAuthorityProgram,
    authority: owner,
    context,
    connection,
  } = fixture;

  requestId ??= 0n;
  skipOnSupplyCapExceeded ??= false;

  expected ??= {
    tokensMinted: parseUnits('9.9'),
  };

  const baseAccounts = {
    vaultCommon: accounts?.commonVault ?? fixture.minterCommonVault.publicKey,
  };

  const from = opt?.from ?? owner;

  // eslint-disable-next-line prefer-const
  let requestStateCached: Awaited<ReturnType<typeof fetchMinterVaultRequestState>>;

  const fetchState = async (_user?: PublicKey) => {
    const minterVaultState = await fetchMinterVaultState(
      vaultsProgram,
      getMinterVaultPda(baseAccounts.vaultCommon),
    );
    const mintAuthorityState = await fetchTokenAuthorityState(
      tokenAuthorityProgram,
      minterVaultState.mintAuthorityPda,
    );

    const commonVaultState = await fetchVaultCommonState(vaultsProgram, baseAccounts.vaultCommon);

    const requestState = await fetchMinterVaultRequestState(
      vaultsProgram,
      getMinterVaultRequestPda(getMinterVaultPda(baseAccounts.vaultCommon), requestId),
      true,
    );

    const state = requestState ?? requestStateCached;
    const commonVaultAccountState = await fetchVaultCommonAccountState(
      vaultsProgram,
      getCommonVaultAccountStatePda(baseAccounts.vaultCommon, state.user),
    );

    const mMintFeed = await fetchDataFeedState(dataFeedProgram, commonVaultState.mMintFeed);

    const paymentTokenState = await fetchPaymentMintState(
      vaultsProgram,
      getPaymentMintStatePda(baseAccounts.vaultCommon, state.paymentMint),
    );

    const paymentTokenFeed = await fetchDataFeedState(dataFeedProgram, paymentTokenState.dataFeed);

    const balanceUserPaymentMint = await getBalance(connection, state.user, state.paymentMint);

    const balanceTokensReceiverPaymentMint = await getBalance(
      connection,
      commonVaultState.tokensReceiver,
      state.paymentMint,
    );

    const balanceFeeReceiverPaymentMint = await getBalance(
      connection,
      commonVaultState.feeReceiver,
      state.paymentMint,
    );

    const balanceUserMToken = await getBalance(
      connection,
      state.user,
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
      minterVaultState,
      commonVaultState,
      requestState,
      balanceUserMToken,
      mintAuthorityState,
      commonVaultAccountState,
      mMintFeed,
      paymentTokenFeed,
      balanceUserPaymentMint,
      balanceTokensReceiverPaymentMint,
      balanceFeeReceiverPaymentMint,
      mTokenState,
      paymentTokenState,
    };
  };

  const stateBefore = await fetchState();
  requestStateCached = stateBefore.requestState;

  const user = stateBefore.requestState.user;

  const tx = await vaultsProgram.methods
    .safeApproveMintRequestAtRequestRate(toBN(requestId), skipOnSupplyCapExceeded)
    .accountsPartial({
      ...baseAccounts,
      authority: from.publicKey,
      mintRequest: getMinterVaultRequestPda(getMinterVaultPda(baseAccounts.vaultCommon), requestId),
      tokenAuthority: stateBefore.minterVaultState.mintAuthorityPda,
      userAccount: user,
      mMint: stateBefore.commonVaultState.mMint,
      mMintTokenProgram: TOKEN_2022_PROGRAM_ID,
      authorityAcRole: getAccountAcRoleStatePda(
        stateBefore.commonVaultState.acRole,
        from.publicKey,
        VAULT_AC_ROLES.VAULT_ADMIN,
      ),
      vaultMinterRole: getAccountAcRoleStatePda(
        stateBefore.mintAuthorityState.acRole,
        getMinterVaultPda(baseAccounts.vaultCommon),
        TOKEN_AUTHORITY_ROLES.M_MINTER,
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

  expect(fromBN(stateAfter.paymentTokenState.allowance)).toEqual(
    fromBN(stateBefore.paymentTokenState.allowance),
  );

  expect(fromBN(stateAfter.commonVaultState.instantDailyLimitUsed)).toEqual(
    fromBN(stateAfter.commonVaultState.instantDailyLimitUsed),
  );

  expect(stateAfter.commonVaultAccountState.freeFromMinFirstMint).toEqual(
    stateAfter.commonVaultAccountState.freeFromMinFirstMint,
  );

  expect(stateAfter.balanceUserPaymentMint).toEqual(stateBefore.balanceUserPaymentMint);

  expect(stateAfter.balanceUserMToken).toEqual(
    stateBefore.balanceUserMToken + (expected?.tokensMinted ?? 0n),
  );

  expect(stateAfter.mTokenState.supply).toEqual(
    stateBefore.mTokenState.supply + (expected?.tokensMinted ?? 0n),
  );

  expect(stateAfter.balanceFeeReceiverPaymentMint).toEqual(
    stateBefore.balanceFeeReceiverPaymentMint,
  );

  expect(stateAfter.balanceTokensReceiverPaymentMint).toEqual(
    stateBefore.balanceTokensReceiverPaymentMint,
  );

  return { stateAfter };
};

export const rejectMintRequest = async (
  fixture: CommonMinterVaultParams,
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
  const { vaultsProgram, authority: owner, context, connection } = fixture;

  requestId ??= 0n;

  const baseAccounts = {
    vaultCommon: accounts?.commonVault ?? fixture.minterCommonVault.publicKey,
  };

  const from = opt?.from ?? owner;

  const fetchState = async (user?: PublicKey) => {
    const minterVaultState = await fetchMinterVaultState(
      vaultsProgram,
      getMinterVaultPda(baseAccounts.vaultCommon),
    );

    const commonVaultState = await fetchVaultCommonState(vaultsProgram, baseAccounts.vaultCommon);

    const requestState = await fetchMinterVaultRequestState(
      vaultsProgram,
      getMinterVaultRequestPda(getMinterVaultPda(baseAccounts.vaultCommon), requestId),
      true,
    );

    const balanceFromMToken = await getBalance(
      connection,
      user ?? requestState.user,
      commonVaultState.mMint,
      TOKEN_2022_PROGRAM_ID,
    );

    return {
      minterVaultState,
      commonVaultState,
      requestState,
      balanceFromMToken,
    };
  };

  const stateBefore = await fetchState();

  const user = stateBefore.requestState.user;

  const tx = await vaultsProgram.methods
    .rejectMintRequest(toBN(requestId))
    .accountsPartial({
      ...baseAccounts,
      authority: from.publicKey,
      mintRequest: getMinterVaultRequestPda(getMinterVaultPda(baseAccounts.vaultCommon), requestId),
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

export const prepareCommonMintTest = async (
  fixture: CommonMinterVaultParams,
  params: {
    addPaymentToken?: {
      stable?: boolean;
      allowance?: bigint;
      fee?: bigint;
    };
  } = {},
  accounts?: {
    commonVault?: PublicKey;
  },
  opt?: OptionalCommonParams,
) => {
  await addPaymentToken(fixture, params.addPaymentToken ?? {}, {
    commonVault: accounts?.commonVault,
  });
  await newVaultCommonAccount(fixture, {}, { commonVault: accounts?.commonVault }, opt);
  await newAccountAc(fixture, {}, undefined, opt);
};
