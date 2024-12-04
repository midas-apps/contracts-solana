import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { DataFeedFixtureReturnType } from "../fixture/dafa-feed.fixture";
import {
  DataFeedMode,
  fetchDataFeedState,
  fetchManualFeedState,
  generateFeedAcccount,
  getManualFeedStatePda,
} from "../helpers/data-feed.helpers";
import {
  approveMint,
  approveMintInstruction,
  expectTxNotReverted,
  expectTxReverted,
  findATA,
  formatUnits,
  fromBN,
  getBalance,
  getOrCreateAta,
  OptionalCommonParams,
  parsePercent,
  parseUnits,
  processTransaction,
  toBN,
  toBNNullable,
} from "../helpers/common.helpers";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";
import { VaultsFixtureReturnType } from "../fixture/vaults.fixture";
import {
  fetchMinterVaultRequestState,
  fetchMinterVaultState,
  fetchPauseInxState,
  fetchPaymentMintState,
  fetchRedeemerVaultRequestState,
  fetchRedeemerVaultState,
  fetchVaultCommonAccountState,
  fetchVaultCommonState,
  generateCommonVaultAccount,
  getCommonVaultAccountStatePda,
  getMinterVaultPda,
  getMinterVaultRequestPda,
  getPauseInxStatePda,
  getPaymentMintStatePda,
  getRedeemerVaultPda,
  getRedeemerVaultRedeemerPda,
  getRedeemerVaultRequestPda,
  PaymentMint,
} from "../helpers/vaults.helpers";
import {
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { DEFAULT_PUBKEY, MAX_U128 } from "../constants/common.constants";
import { getAccountAcRoleStatePda } from "../helpers/ac.helpers";
import { VAULT_AC_ROLES, VaultActionIds } from "../constants/vaults.constants";

type CommonVaultsParams = VaultsFixtureReturnType;

export const newVaultCommon = async (
  fixture: CommonVaultsParams,
  {
    ac,
    acRole,
    feeReceiver,
    instantDailyLimit,
    instantFee,
    mDataFeed,
    mMint,
    minAmount,
    tokensReceiver,
    variationTolerance,
    vaultCommon,
  }: {
    ac?: PublicKey;
    vaultCommon?: Keypair;
    mMint?: PublicKey;
    mDataFeed?: PublicKey;
    acRole?: PublicKey;
    tokensReceiver?: PublicKey;
    feeReceiver?: PublicKey;
    instantFee?: bigint;
    instantDailyLimit?: bigint;
    variationTolerance?: bigint;
    minAmount?: bigint;
  },

  opt?: OptionalCommonParams
) => {
  const { dataFeedProgram, vaultsProgram, authority: owner, context } = fixture;
  const from = opt?.from ?? owner;

  ac ??= fixture.ac.publicKey;
  mMint ??= fixture.mTBillMint.publicKey;
  mDataFeed ??= fixture.dataFeedMTBill.publicKey;

  acRole ??= fixture.acRoleMTbill.publicKey;
  tokensReceiver ??= fixture.tokensReceiver.publicKey;
  feeReceiver ??= fixture.feeReceiver.publicKey;
  instantFee ??= 0n;
  instantDailyLimit ??= MAX_U128;
  variationTolerance ??= parsePercent(1);
  minAmount ??= 0n;
  vaultCommon ??= generateCommonVaultAccount();

  const fetchState = async () => {
    const common = await fetchVaultCommonState(
      vaultsProgram,
      vaultCommon.publicKey,
      true
    );

    return {
      common,
    };
  };

  const tx = await vaultsProgram.methods
    .newCommonVault(
      ac,
      mMint,
      mDataFeed,
      acRole,
      tokensReceiver,
      feeReceiver,
      toBN(instantFee),
      toBN(instantDailyLimit),
      toBN(variationTolerance),
      toBN(minAmount)
    )
    .accounts({
      signer: from.publicKey,
      vaultCommon: vaultCommon.publicKey,
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from, vaultCommon], opt);
    return;
  }

  const stateBefore = await fetchState();

  await expectTxNotReverted(context, tx, [from, vaultCommon]);

  const stateAfter = await fetchState();

  expect(stateBefore.common).toEqual(null);
  expect(stateAfter.common).not.toEqual(null);

  expect(stateAfter.common.ac.equals(ac)).toBe(true);
  expect(stateAfter.common.mMint.equals(mMint)).toBe(true);
  expect(stateAfter.common.mMintFeed.equals(mDataFeed)).toBe(true);

  expect(stateAfter.common.acRole.equals(acRole)).toBe(true);
  expect(stateAfter.common.tokensReceiver.equals(tokensReceiver)).toBe(true);
  expect(stateAfter.common.feeReceiver.equals(feeReceiver)).toBe(true);
  expect(fromBN(stateAfter.common.instantFee)).toBe(instantFee);
  expect(fromBN(stateAfter.common.instantDailyLimit)).toBe(instantDailyLimit);
  expect(fromBN(stateAfter.common.variationTolerance)).toBe(variationTolerance);
  expect(fromBN(stateAfter.common.minAmount)).toBe(minAmount);

  return vaultCommon.publicKey;
};

export const updateVaultCommon = async (
  fixture: CommonVaultsParams,
  {
    acRole,
    feeReceiver,
    instantDailyLimit,
    instantFee,
    minAmount,
    tokensReceiver,
    variationTolerance,
    vaultCommon,
  }: {
    vaultCommon?: PublicKey;
    acRole?: PublicKey;
    tokensReceiver?: PublicKey;
    feeReceiver?: PublicKey;
    instantFee?: bigint;
    instantDailyLimit?: bigint;
    variationTolerance?: bigint;
    minAmount?: bigint;
  },

  opt?: OptionalCommonParams
) => {
  const { dataFeedProgram, vaultsProgram, authority: owner, context } = fixture;
  const from = opt?.from ?? owner;

  acRole ??= null;
  tokensReceiver ??= null;
  feeReceiver ??= null;
  instantFee ??= null;
  instantDailyLimit ??= null;
  variationTolerance ??= null;
  minAmount ??= null;
  vaultCommon ??= fixture.minterCommonVault.publicKey;

  const fetchState = async () => {
    const common = await fetchVaultCommonState(vaultsProgram, vaultCommon);

    return {
      common,
    };
  };

  const stateBefore = await fetchState();

  const tx = await vaultsProgram.methods
    .updateCommonVault(
      acRole,
      tokensReceiver,
      feeReceiver,
      toBNNullable(instantFee),
      toBNNullable(instantDailyLimit),
      toBNNullable(variationTolerance),
      toBNNullable(minAmount)
    )
    .accountsPartial({
      authority: from.publicKey,
      vaultCommon: vaultCommon,
      authorityAcRole: getAccountAcRoleStatePda(
        stateBefore.common.acRole,
        from.publicKey,
        VAULT_AC_ROLES.VAULT_ADMIN
      ),
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState();

  if (acRole !== null) {
    expect(stateAfter.common.acRole.equals(acRole)).toBe(true);
  }

  if (tokensReceiver !== null) {
    expect(stateAfter.common.tokensReceiver.equals(tokensReceiver)).toBe(true);
  }

  if (feeReceiver !== null) {
    expect(stateAfter.common.feeReceiver.equals(feeReceiver)).toBe(true);
  }

  if (instantFee !== null) {
    expect(fromBN(stateAfter.common.instantFee)).toBe(instantFee);
  }

  if (instantDailyLimit !== null) {
    expect(fromBN(stateAfter.common.instantDailyLimit)).toBe(instantDailyLimit);
  }

  if (variationTolerance !== null) {
    expect(fromBN(stateAfter.common.variationTolerance)).toBe(
      variationTolerance
    );
  }

  if (minAmount !== null) {
    expect(fromBN(stateAfter.common.minAmount)).toBe(minAmount);
  }
};

export const newVaultCommonAccount = async (
  fixture: CommonVaultsParams,
  {
    account,
  }: {
    account?: PublicKey;
  },
  accounts?: {
    commonVault?: PublicKey;
  },
  opt?: OptionalCommonParams
) => {
  const { dataFeedProgram, vaultsProgram, authority: owner, context } = fixture;
  const from = opt?.from ?? owner;

  account ??= from.publicKey;

  const baseAccounts = {
    vaultCommon: accounts?.commonVault ?? fixture.minterCommonVault.publicKey,
  };

  const fetchState = async () => {
    const vaultCommonAccount = await fetchVaultCommonAccountState(
      vaultsProgram,
      getCommonVaultAccountStatePda(baseAccounts.vaultCommon, account),
      true
    );

    return {
      vaultCommonAccount,
    };
  };

  const stateBefore = await fetchState();

  const tx = await vaultsProgram.methods
    .newCommonVaultAccount()
    .accounts({
      ...baseAccounts,
      account,
      signer: from.publicKey,
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState();

  expect(stateBefore.vaultCommonAccount).toEqual(null);
  expect(stateAfter.vaultCommonAccount).not.toEqual(null);
  expect(stateAfter.vaultCommonAccount.freeFromMinAmount).toBe(false);
  expect(stateAfter.vaultCommonAccount.freeFromMinFirstMint).toBe(false);
  expect(stateAfter.vaultCommonAccount.waivedFee).toBe(false);
};

export const updateVaultCommonAccount = async (
  fixture: CommonVaultsParams,
  {
    account,
    freeFromMinAmount,
    freeFromMinFirstMint,
    waivedFee,
  }: {
    freeFromMinAmount?: boolean;
    freeFromMinFirstMint?: boolean;
    waivedFee?: boolean;
    account?: PublicKey;
  },
  accounts?: {
    commonVault?: PublicKey;
  },
  opt?: OptionalCommonParams
) => {
  const { vaultsProgram, authority: owner, context } = fixture;
  const from = opt?.from ?? owner;

  freeFromMinAmount ??= null;
  freeFromMinFirstMint ??= null;
  waivedFee ??= null;

  account ??= from.publicKey;

  const baseAccounts = {
    vaultCommon: accounts?.commonVault ?? fixture.minterCommonVault.publicKey,
  };

  const fetchState = async () => {
    const vaultCommonAccount = await fetchVaultCommonAccountState(
      vaultsProgram,
      getCommonVaultAccountStatePda(baseAccounts.vaultCommon, account)
    );

    const vaultCommonState = await fetchVaultCommonState(
      vaultsProgram,
      baseAccounts.vaultCommon
    );

    return {
      vaultCommonAccount,
      vaultCommonState,
    };
  };

  const stateBefore = await fetchState();

  const tx = await vaultsProgram.methods
    .updateCommonVaultAccount(
      freeFromMinAmount,
      freeFromMinFirstMint,
      waivedFee
    )
    .accountsPartial({
      ...baseAccounts,
      account,
      authority: from.publicKey,
      vaultCommonAccount: getCommonVaultAccountStatePda(
        baseAccounts.vaultCommon,
        account
      ),
      authorityAcRole: getAccountAcRoleStatePda(
        stateBefore.vaultCommonState.acRole,
        account,
        VAULT_AC_ROLES.VAULT_ADMIN
      ),
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState();

  expect(stateAfter.vaultCommonAccount).not.toEqual(null);

  if (freeFromMinAmount !== null) {
    expect(stateAfter.vaultCommonAccount.freeFromMinAmount).toBe(
      freeFromMinAmount
    );
  }

  if (freeFromMinFirstMint !== null) {
    expect(stateAfter.vaultCommonAccount.freeFromMinFirstMint).toBe(
      freeFromMinFirstMint
    );
  }

  if (waivedFee !== null) {
    expect(stateAfter.vaultCommonAccount.waivedFee).toBe(waivedFee);
  }
};

export const addPaymentToken = async (
  fixture: CommonVaultsParams,
  {
    allowance,
    dataFeed,
    fee,
    stable,
    mint,
  }: {
    mint?: PublicKey;
    dataFeed?: PublicKey;
    fee?: bigint;
    allowance?: bigint;
    stable?: boolean;
  },
  accounts?: {
    tokenProgram?: PublicKey;
    commonVault?: PublicKey;
  },
  opt?: OptionalCommonParams
) => {
  const {
    dataFeedProgram,
    vaultsProgram,
    authority: owner,
    context,
    provider,
  } = fixture;

  allowance ??= MAX_U128;
  fee ??= parseUnits("10", 2);
  stable ??= true;
  dataFeed ??= fixture.paymentMints.usdc.feed.publicKey;
  mint ??= fixture.paymentMints.usdc.mint;

  const baseAccounts = {
    tokenProgram: accounts?.tokenProgram ?? TOKEN_PROGRAM_ID,
    vaultCommon: accounts?.commonVault ?? fixture.minterCommonVault.publicKey,
  };

  const fetchState = async () => {
    const paymentTokenState = await fetchPaymentMintState(
      vaultsProgram,
      getPaymentMintStatePda(baseAccounts.vaultCommon, mint),
      true
    );

    const commonState = await fetchVaultCommonState(
      vaultsProgram,
      baseAccounts.vaultCommon
    );

    return {
      paymentTokenState,
      commonState,
    };
  };

  const stateBefore = await fetchState();

  const from = opt?.from ?? owner;

  const isFiat = mint.equals(DEFAULT_PUBKEY);

  const tx = isFiat
    ? await vaultsProgram.methods
        .addPaymentTokenFiat(toBN(fee), toBN(allowance))
        .accountsPartial({
          ...baseAccounts,
          authority: from.publicKey,
          authorityAcRole: getAccountAcRoleStatePda(
            stateBefore.commonState.acRole,
            from.publicKey,
            VAULT_AC_ROLES.VAULT_ADMIN
          ),
        })
        .transaction()
    : await vaultsProgram.methods
        .addPaymentToken(toBN(fee), toBN(allowance), stable)
        .accountsPartial({
          ...baseAccounts,
          authority: from.publicKey,
          dataFeed: dataFeed,
          paymentMint: mint,
          authorityAcRole: getAccountAcRoleStatePda(
            stateBefore.commonState.acRole,
            from.publicKey,
            VAULT_AC_ROLES.VAULT_ADMIN
          ),
        })
        .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState();

  expect(stateAfter).not.toEqual(null);
  expect(stateAfter.paymentTokenState.allowance.eq(toBN(allowance))).toBe(true);
  expect(stateAfter.paymentTokenState.fee.eq(toBN(fee))).toBe(true);
  expect(
    stateAfter.paymentTokenState.dataFeed.equals(
      isFiat ? DEFAULT_PUBKEY : dataFeed
    )
  ).toBe(true);
  expect(stateAfter.paymentTokenState.stable).toBe(isFiat ? false : stable);
};

export const removePaymentToken = async (
  fixture: CommonVaultsParams,
  {
    mint,
  }: {
    mint?: PublicKey;
  },
  accounts?: {
    tokenProgram?: PublicKey;
    commonVault?: PublicKey;
  },
  opt?: OptionalCommonParams
) => {
  const {
    dataFeedProgram,
    vaultsProgram,
    authority: owner,
    context,
    provider,
  } = fixture;

  mint ??= fixture.paymentMints.usdc.mint;

  const baseAccounts = {
    tokenProgram: accounts?.tokenProgram ?? TOKEN_PROGRAM_ID,
    vaultCommon: accounts?.commonVault ?? fixture.minterCommonVault.publicKey,
  };

  const fetchState = async () => {
    const paymentTokenState = await fetchPaymentMintState(
      vaultsProgram,
      getPaymentMintStatePda(baseAccounts.vaultCommon, mint),
      true
    );

    const commonState = await fetchVaultCommonState(
      vaultsProgram,
      baseAccounts.vaultCommon
    );

    return {
      paymentTokenState,
      commonState,
    };
  };

  const stateBefore = await fetchState();

  const from = opt?.from ?? owner;

  const isFiat = mint.equals(DEFAULT_PUBKEY);

  const tx = await vaultsProgram.methods
    .removePaymentToken(mint)
    .accountsPartial({
      ...baseAccounts,
      authority: from.publicKey,
      authorityAcRole: getAccountAcRoleStatePda(
        stateBefore.commonState.acRole,
        from.publicKey,
        VAULT_AC_ROLES.VAULT_ADMIN
      ),
      paymentMintState: getPaymentMintStatePda(accounts.commonVault, mint),
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState();

  expect(stateAfter.paymentTokenState).toEqual(null);
};

export const updatePaymentToken = async (
  fixture: CommonVaultsParams,
  {
    allowance,
    dataFeed,
    fee,
    stable,
    mint,
  }: {
    mint?: PublicKey;
    dataFeed?: PublicKey;
    fee?: bigint;
    allowance?: bigint;
    stable?: boolean;
  },
  accounts?: {
    tokenProgram?: PublicKey;
    commonVault?: PublicKey;
  },
  opt?: OptionalCommonParams
) => {
  const { vaultsProgram, authority: owner, context } = fixture;

  allowance ??= null;
  fee ??= null;
  stable ??= null;
  dataFeed ??= null;
  mint ??= fixture.paymentMints.usdc.mint;

  const baseAccounts = {
    tokenProgram: accounts?.tokenProgram ?? TOKEN_PROGRAM_ID,
    vaultCommon: accounts?.commonVault ?? fixture.minterCommonVault.publicKey,
  };

  const fetchState = async () => {
    const paymentTokenState = await fetchPaymentMintState(
      vaultsProgram,
      getPaymentMintStatePda(baseAccounts.vaultCommon, mint)
    );

    const commonState = await fetchVaultCommonState(
      vaultsProgram,
      baseAccounts.vaultCommon
    );

    return {
      paymentTokenState,
      commonState,
    };
  };

  const stateBefore = await fetchState();

  const from = opt?.from ?? owner;

  const tx = await vaultsProgram.methods
    .updatePaymentToken(toBNNullable(fee), toBNNullable(allowance), stable)
    .accountsPartial({
      ...baseAccounts,
      authority: from.publicKey,
      newDataFeed: dataFeed,
      authorityAcRole: getAccountAcRoleStatePda(
        stateBefore.commonState.acRole,
        from.publicKey,
        VAULT_AC_ROLES.VAULT_ADMIN
      ),
      paymentMintState: getPaymentMintStatePda(baseAccounts.vaultCommon, mint),
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState();

  expect(stateAfter).not.toEqual(null);

  if (allowance !== null) {
    expect(stateAfter.paymentTokenState.allowance.eq(toBN(allowance))).toBe(
      true
    );
  }

  if (fee !== null) {
    expect(stateAfter.paymentTokenState.fee.eq(toBN(fee))).toBe(true);
  }

  if (dataFeed !== null) {
    expect(stateAfter.paymentTokenState.dataFeed.equals(dataFeed)).toBe(true);
  }

  if (stable !== null) {
    expect(stateAfter.paymentTokenState.stable).toBe(stable);
  }
};

export const newPauseInx = async (
  fixture: CommonVaultsParams,
  {
    fnId,
  }: {
    fnId?: number;
  },
  accounts?: {
    commonVault?: PublicKey;
  },
  opt?: OptionalCommonParams
) => {
  const { vaultsProgram, authority: owner, context } = fixture;

  fnId ??= VaultActionIds.MINT_INSTANT;

  const baseAccounts = {
    vaultCommon: accounts?.commonVault ?? fixture.minterCommonVault.publicKey,
  };

  const fetchState = async () => {
    const pauseInxState = await fetchPauseInxState(
      vaultsProgram,
      getPauseInxStatePda(baseAccounts.vaultCommon, fnId),
      true
    );

    const commonState = await fetchVaultCommonState(
      vaultsProgram,
      baseAccounts.vaultCommon
    );

    return {
      pauseInxState,
      commonState,
    };
  };

  const stateBefore = await fetchState();

  const from = opt?.from ?? owner;

  const tx = await vaultsProgram.methods
    .newPauseInx(fnId)
    .accountsPartial({
      ...baseAccounts,
      authority: from.publicKey,
      authorityAcRole: getAccountAcRoleStatePda(
        stateBefore.commonState.acRole,
        from.publicKey,
        VAULT_AC_ROLES.VAULT_PAUSER
      ),
      pauseInxState: getPauseInxStatePda(baseAccounts.vaultCommon, fnId),
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState();

  expect(stateAfter.pauseInxState).not.toEqual(null);
  expect(stateAfter.pauseInxState.paused).toBe(false);
};

export const updatePauseInx = async (
  fixture: CommonVaultsParams,
  {
    fnId,
    paused,
  }: {
    fnId?: number;
    paused?: boolean;
  },
  accounts?: {
    commonVault?: PublicKey;
  },
  opt?: OptionalCommonParams
) => {
  const { vaultsProgram, authority: owner, context } = fixture;

  fnId ??= VaultActionIds.MINT_INSTANT;
  paused ??= true;

  const baseAccounts = {
    vaultCommon: accounts?.commonVault ?? fixture.minterCommonVault.publicKey,
  };

  const fetchState = async () => {
    const pauseInxState = await fetchPauseInxState(
      vaultsProgram,
      getPauseInxStatePda(baseAccounts.vaultCommon, fnId)
    );

    const commonState = await fetchVaultCommonState(
      vaultsProgram,
      baseAccounts.vaultCommon
    );

    return {
      pauseInxState,
      commonState,
    };
  };

  const stateBefore = await fetchState();

  const from = opt?.from ?? owner;

  const tx = await vaultsProgram.methods
    .updatePauseInx(fnId, paused)
    .accountsPartial({
      ...baseAccounts,
      authority: from.publicKey,
      authorityAcRole: getAccountAcRoleStatePda(
        stateBefore.commonState.acRole,
        from.publicKey,
        VAULT_AC_ROLES.VAULT_PAUSER
      ),
      pauseInxState: getPauseInxStatePda(baseAccounts.vaultCommon, fnId),
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState();

  expect(stateAfter.pauseInxState.paused).toBe(paused);
};

export const updatePause = async (
  fixture: CommonVaultsParams,
  {
    paused,
  }: {
    paused?: boolean;
  },
  accounts?: {
    commonVault?: PublicKey;
  },
  opt?: OptionalCommonParams
) => {
  const { vaultsProgram, authority: owner, context } = fixture;

  paused ??= true;

  const baseAccounts = {
    vaultCommon: accounts?.commonVault ?? fixture.minterCommonVault.publicKey,
  };

  const fetchState = async () => {
    const commonState = await fetchVaultCommonState(
      vaultsProgram,
      baseAccounts.vaultCommon
    );

    return {
      commonState,
    };
  };

  const stateBefore = await fetchState();

  const from = opt?.from ?? owner;

  const tx = await vaultsProgram.methods
    .updatePause(paused)
    .accountsPartial({
      ...baseAccounts,
      authority: from.publicKey,
      authorityAcRole: getAccountAcRoleStatePda(
        stateBefore.commonState.acRole,
        from.publicKey,
        VAULT_AC_ROLES.VAULT_PAUSER
      ),
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState();

  expect(stateAfter.commonState.paused).toBe(paused);
};
