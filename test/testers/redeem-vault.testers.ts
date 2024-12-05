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
  parseUnits,
  processTransaction,
  toBN,
} from "../helpers/common.helpers";
import { SYSTEM_PROGRAM_ID } from "@coral-xyz/anchor/dist/cjs/native/system";
import { VaultsFixtureReturnType } from "../fixture/vaults.fixture";
import {
  fetchMinterVaultRequestState,
  fetchMinterVaultState,
  fetchPaymentMintState,
  fetchRedeemerVaultRequestState,
  fetchRedeemerVaultState,
  fetchVaultCommonAccountState,
  fetchVaultCommonState,
  getCommonVaultAccountStatePda,
  getMinterVaultPda,
  getMinterVaultRequestPda,
  getPaymentMintStatePda,
  getRedeemerVaultPda,
  getRedeemerVaultRedeemerPda,
  getRedeemerVaultRequestPda,
  PaymentMint,
} from "../helpers/vaults.helpers";
import {
  createMintToInstruction,
  createTransferCheckedInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { MAX_U128 } from "../constants/common.constants";
import {
  addPaymentToken,
  newVaultCommonAccount,
} from "./common-vaults.testers";
import {
  fetchAccountAcState,
  getAccountAcRoleStatePda,
  getAccountAcStatePda,
} from "../helpers/ac.helpers";
import { newAccountAc } from "./ac.testers";
import { VAULT_AC_ROLES } from "../constants/vaults.constants";
import { fetchTokenAuthorityState } from "../helpers/token-authority.helpers";
import { TOKEN_AUTHORITY_ROLES } from "../constants/token-authority.constants";

type CommonRedeemVaultParams = VaultsFixtureReturnType;

export const redeemInstant = async (
  fixture: CommonRedeemVaultParams,
  {
    amountMToken,
    minReceiveAmount,
    paymentMint,
  }: {
    paymentMint?: PublicKey;
    amountMToken?: bigint;
    minReceiveAmount?: bigint;
  },
  accounts?: {
    ac?: PublicKey;
    commonVault?: PublicKey;
  },
  opt?: OptionalCommonParams
) => {
  const {
    dataFeedProgram,
    vaultsProgram,
    authority: owner,
    context,
    connection,
  } = fixture;

  amountMToken ??= parseUnits("10");
  minReceiveAmount ??= parseUnits("9");
  paymentMint ??= fixture.paymentMints.usdc.mint;

  const baseAccounts = {
    vaultCommon: accounts?.commonVault ?? fixture.redeemerCommonVault.publicKey,
    ac: accounts?.ac ?? fixture.ac.publicKey,
  };

  const from = opt?.from ?? owner;

  const fetchState = async () => {
    const minterVaultState = await fetchRedeemerVaultState(
      vaultsProgram,
      getRedeemerVaultPda(baseAccounts.vaultCommon)
    );

    const commonVaultState = await fetchVaultCommonState(
      vaultsProgram,
      baseAccounts.vaultCommon
    );

    const mMintFeed = await fetchDataFeedState(
      dataFeedProgram,
      commonVaultState.mMintFeed
    );

    const paymentTokenState = await fetchPaymentMintState(
      vaultsProgram,
      getPaymentMintStatePda(baseAccounts.vaultCommon, paymentMint)
    );

    const paymentTokenFeed = await fetchDataFeedState(
      dataFeedProgram,
      paymentTokenState.dataFeed
    );

    const balanceFromPaymentMint = await getBalance(
      connection,
      from.publicKey,
      paymentMint
    );

    const balanceFeeReceiverMToken = await getBalance(
      connection,
      commonVaultState.feeReceiver,
      paymentMint
    );

    const balanceFromMToken = await getBalance(
      connection,
      from.publicKey,
      commonVaultState.mMint,
      TOKEN_2022_PROGRAM_ID
    );

    return {
      minterVaultState,
      commonVaultState,
      mMintFeed,
      paymentTokenState,
      paymentTokenFeed,
      balanceFromPaymentMint,
      balanceFeeReceiverMToken,
      balanceFromMToken,
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
      paymentMint: paymentMint,
      paymentMintDataFeed: stateBefore.paymentTokenState.dataFeed,
      paymentMintFeed: stateBefore.paymentTokenFeed.underlyingFeed,
      paymentMintTokenProgram: TOKEN_PROGRAM_ID,
      accountAc: getAccountAcStatePda(baseAccounts.ac, from.publicKey),
    })
    .preInstructions([
      approveMintInstruction(
        stateBefore.commonVaultState.mMint,
        from,
        getRedeemerVaultPda(baseAccounts.vaultCommon),
        amountMToken,
        TOKEN_2022_PROGRAM_ID
      ),
    ])
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState();
};

export const redeemRequest = async (
  fixture: CommonRedeemVaultParams,
  {
    amountMToken,
    paymentMint,
  }: {
    paymentMint?: PublicKey;
    amountMToken?: bigint;
  },
  accounts?: {
    minterVault?: PublicKey;
    ac?: PublicKey;
    commonVault?: PublicKey;
  },
  opt?: OptionalCommonParams
) => {
  const {
    dataFeedProgram,
    vaultsProgram,
    authority: owner,
    context,
    connection,
  } = fixture;

  amountMToken ??= parseUnits("10", fixture.paymentMints.usdc.decimals);
  paymentMint ??= fixture.paymentMints.usdc.mint;

  const baseAccounts = {
    vaultCommon: accounts?.commonVault ?? fixture.redeemerCommonVault.publicKey,
    ac: accounts?.ac ?? fixture.ac.publicKey,
  };

  const from = opt?.from ?? owner;

  const fetchState = async () => {
    const redeemerVaultState = await fetchRedeemerVaultState(
      vaultsProgram,
      getRedeemerVaultPda(baseAccounts.vaultCommon)
    );

    const commonVaultState = await fetchVaultCommonState(
      vaultsProgram,
      baseAccounts.vaultCommon
    );

    const requestState = await fetchRedeemerVaultRequestState(
      vaultsProgram,
      getRedeemerVaultRequestPda(
        getRedeemerVaultPda(baseAccounts.vaultCommon),
        fromBN(commonVaultState.requestsCount)
      ),
      true
    );

    const mMintFeed = await fetchDataFeedState(
      dataFeedProgram,
      commonVaultState.mMintFeed
    );

    const paymentTokenState = await fetchPaymentMintState(
      vaultsProgram,
      getPaymentMintStatePda(baseAccounts.vaultCommon, paymentMint)
    );

    const paymentTokenFeed = await fetchDataFeedState(
      dataFeedProgram,
      paymentTokenState.dataFeed
    );

    // const balanceFromPaymentMint = await getBalance(
    //   connection,
    //   from.publicKey,
    //   paymentMint
    // );

    // const balanceTokensReceiverPaymentMint = await getBalance(
    //   connection,
    //   commonVaultState.tokensReceiver,
    //   paymentMint
    // );

    // const balanceFeeReceiverPaymentMint = await getBalance(
    //   connection,
    //   commonVaultState.tokensReceiver,
    //   paymentMint
    // );

    // const balanceFromMToken = await getBalance(
    //   connection,
    //   from.publicKey,
    //   commonVaultState.mMint,
    //   TOKEN_2022_PROGRAM_ID
    // );

    return {
      redeemerVaultState,
      commonVaultState,
      mMintFeed,
      paymentTokenState,
      paymentTokenFeed,
      requestState,
    };
  };

  const stateBefore = await fetchState();

  const tx = await vaultsProgram.methods
    .redeemRequest(toBN(amountMToken))
    .accountsPartial({
      ...baseAccounts,

      mMintFeed: stateBefore.mMintFeed.underlyingFeed,
      mMintDataFeed: stateBefore.commonVaultState.mMintFeed,
      signer: from.publicKey,
      paymentMint: paymentMint,
      paymentMintDataFeed: stateBefore.paymentTokenState.dataFeed,
      paymentMintFeed: stateBefore.paymentTokenFeed.underlyingFeed,
      paymentMintTokenProgram: TOKEN_PROGRAM_ID,
      redeemRequest: getRedeemerVaultRequestPda(
        getRedeemerVaultPda(baseAccounts.vaultCommon),
        fromBN(stateBefore.commonVaultState.requestsCount)
      ),
      mMint: stateBefore.commonVaultState.mMint,
      mMintTokenProgram: TOKEN_2022_PROGRAM_ID,
      accountAc: getAccountAcStatePda(baseAccounts.ac, from.publicKey),
    })
    .preInstructions([
      approveMintInstruction(
        stateBefore.commonVaultState.mMint,
        from,
        getRedeemerVaultPda(baseAccounts.vaultCommon),
        amountMToken,
        TOKEN_2022_PROGRAM_ID
      ),
    ])
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState();

  expect(stateAfter.requestState).not.toEqual(null);
};

export const approveRedeemRequest = async (
  fixture: CommonRedeemVaultParams,
  {
    newRate,
    isSafe,
    requestId,
  }: {
    requestId?: bigint;
    newRate?: bigint;
    isSafe?: boolean;
  },
  accounts?: {
    commonVault?: PublicKey;
  },
  opt?: OptionalCommonParams
) => {
  const { vaultsProgram, authority: owner, context, connection } = fixture;

  newRate ??= parseUnits("1");
  isSafe ??= false;
  requestId ??= 0n;

  const baseAccounts = {
    vaultCommon: accounts?.commonVault ?? fixture.redeemerCommonVault.publicKey,
  };

  const from = opt?.from ?? owner;

  const fetchState = async (user?: PublicKey) => {
    const redeemerVaultState = await fetchRedeemerVaultState(
      vaultsProgram,
      getRedeemerVaultPda(baseAccounts.vaultCommon)
    );

    const commonVaultState = await fetchVaultCommonState(
      vaultsProgram,
      baseAccounts.vaultCommon
    );

    const requestState = await fetchRedeemerVaultRequestState(
      vaultsProgram,
      getRedeemerVaultRequestPda(
        getRedeemerVaultPda(baseAccounts.vaultCommon),
        requestId
      ),
      true
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
  expect(stateBefore.requestState).not.toEqual(null);

  const user = stateBefore.requestState.user;

  const tx = await vaultsProgram.methods
    .approveRedeemRequest(toBN(requestId), toBN(newRate), isSafe)
    .accountsPartial({
      ...baseAccounts,
      authority: from.publicKey,
      redeemRequest: getRedeemerVaultRequestPda(
        getRedeemerVaultPda(baseAccounts.vaultCommon),
        requestId
      ),
      userAccount: user,
      mMint: stateBefore.commonVaultState.mMint,
      mMintTokenProgram: TOKEN_2022_PROGRAM_ID,
      paymentMint: stateBefore.requestState.paymentMint,
      paymentMintTokenProgram: TOKEN_PROGRAM_ID,
      requestRedeemer: getRedeemerVaultRedeemerPda(baseAccounts.vaultCommon),
      authorityAcRole: getAccountAcRoleStatePda(
        stateBefore.commonVaultState.acRole,
        from.publicKey,
        VAULT_AC_ROLES.VAULT_ADMIN
      ),
      // requestRedeemer: stateBefore.redeemerVaultState.requestRedeemer,
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
  opt?: OptionalCommonParams
) => {
  const { vaultsProgram, authority: owner, context, connection } = fixture;

  requestId ??= 0n;

  const baseAccounts = {
    vaultCommon: accounts?.commonVault ?? fixture.redeemerCommonVault.publicKey,
  };

  const from = opt?.from ?? owner;

  const fetchState = async (user?: PublicKey) => {
    const redeemerVaultState = await fetchRedeemerVaultState(
      vaultsProgram,
      getRedeemerVaultPda(baseAccounts.vaultCommon)
    );

    const commonVaultState = await fetchVaultCommonState(
      vaultsProgram,
      baseAccounts.vaultCommon
    );

    const requestState = await fetchRedeemerVaultRequestState(
      vaultsProgram,
      getRedeemerVaultRequestPda(
        getRedeemerVaultPda(baseAccounts.vaultCommon),
        requestId
      ),
      true
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
        requestId
      ),
      userAccount: user,
      authorityAcRole: getAccountAcRoleStatePda(
        stateBefore.commonVaultState.acRole,
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
  opt?: OptionalCommonParams
) => {
  mint ??= fixture.paymentMints.usdc;
  to ??= fixture.authority.publicKey;
  amountBase9 ??= parseUnits("10");

  const amount = parseUnits(formatUnits(amountBase9).toString(), mint.decimals);

  // TODO: pass optional from
  const from = opt?.from ?? fixture.authority;

  const { ata } = await getOrCreateAta(
    fixture.context,
    fixture.provider.connection,
    mint.mint,
    to,
    from,
    tokenProgram
  );

  await expectTxNotReverted(
    fixture.context,

    new Transaction().add(
      createMintToInstruction(
        mint.mint,
        ata,
        from.publicKey,
        amount,
        undefined,
        tokenProgram
      )
    ),
    [from]
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
  opt?: OptionalCommonParams
) => {
  mint ??= fixture.paymentMints.usdc;
  to ??= fixture.authority.publicKey;

  // TODO: pass optional from
  const from = opt?.from ?? fixture.authority;

  amount ??= await getBalance(fixture.connection, from.publicKey, mint.mint);

  const { ata: ataFrom } = await getOrCreateAta(
    fixture.context,
    fixture.provider.connection,
    mint.mint,
    from.publicKey,
    from,
    tokenProgram
  );

  const { ata: ataTo } = await getOrCreateAta(
    fixture.context,
    fixture.provider.connection,
    mint.mint,
    to,
    from,
    tokenProgram
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
        tokenProgram
      )
    ),
    [from]
  );
};

export const mintPaymentTokenAndApprove = async (
  fixture: CommonRedeemVaultParams,
  {
    mint,
    to,
    amountBase9,
    approveTo,
    approveFrom,
  }: {
    mint?: PaymentMint;
    approveTo?: PublicKey;
    to?: PublicKey;
    amountBase9?: bigint;
    approveFrom?: Keypair;
  }
) => {
  mint ??= fixture.paymentMints.usdc;
  to ??= fixture.authority.publicKey;
  amountBase9 ??= parseUnits("10");
  approveTo ??= getRedeemerVaultPda(fixture.redeemerCommonVault.publicKey);
  approveFrom ??= fixture.requestRedeemer;

  const amount = parseUnits(formatUnits(amountBase9).toString(), mint.decimals);

  // TODO: pass optional from
  const from = fixture.authority;

  const { ata } = await getOrCreateAta(
    fixture.context,
    fixture.provider.connection,
    mint.mint,
    to,
    from
  );

  await processTransaction(
    fixture.context,

    new Transaction().add(
      createMintToInstruction(mint.mint, ata, from.publicKey, amount),
      approveMintInstruction(mint.mint, approveFrom, approveTo, amount)
    ),
    [from, approveFrom]
  );
};

export const prepareCommonRedeemTest = async (
  fixture: CommonRedeemVaultParams
) => {
  await addPaymentToken(
    fixture,
    {},
    { commonVault: fixture.redeemerCommonVault.publicKey }
  );

  await newVaultCommonAccount(
    fixture,
    {},
    { commonVault: fixture.redeemerCommonVault.publicKey }
  );
  await newAccountAc(fixture, {});
};
