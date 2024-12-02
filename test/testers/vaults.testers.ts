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
  fetchAccountAcState,
  fetchMintAuthorityState,
  fetchMinterVaultRequestState,
  fetchMinterVaultState,
  fetchPaymentMintState,
  fetchRedeemerVaultRequestState,
  fetchRedeemerVaultState,
  fetchVaultCommonAccountState,
  fetchVaultCommonState,
  getAccountAcStatePda,
  getCommonVaultAccountStatePda,
  getMintAuthorityPda,
  getMinterVaultPda,
  getMinterVaultRequestPda,
  getPaymentMintStatePda,
  getRedeemerVaultPda,
  getRedeemerVaultRedeemerPda,
  getRedeemerVaultRequestPda,
  mintAuthoritySeedToBuffer,
  PaymentMint,
} from "../helpers/vaults.helpers";
import {
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { MAX_U128 } from "../constants/common.constants";

type CommonVaultsParams = VaultsFixtureReturnType;

export const mintInstant = async (
  fixture: CommonVaultsParams,
  {
    amountToken,
    minReceiveAmount,
    referrerId,
    paymentMint,
  }: {
    paymentMint?: PublicKey;
    amountToken?: bigint;
    minReceiveAmount?: bigint;
    referrerId?: number[];
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

  amountToken ??= parseUnits("10", fixture.paymentMints.usdc.decimals);
  minReceiveAmount ??= parseUnits("9");
  referrerId ??= new Array(32).fill(0);
  paymentMint ??= fixture.paymentMints.usdc.mint;

  const baseAccounts = {
    vaultCommon: accounts?.commonVault ?? fixture.minterCommonVault.publicKey,
    ac: accounts?.ac ?? fixture.ac.publicKey,
  };

  const from = opt?.from ?? owner;

  const fetchState = async () => {
    const minterVaultState = await fetchMinterVaultState(
      vaultsProgram,
      getMinterVaultPda(baseAccounts.vaultCommon)
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

    const balanceTokensReceiverPaymentMint = await getBalance(
      connection,
      commonVaultState.tokensReceiver,
      paymentMint
    );

    const balanceFeeReceiverPaymentMint = await getBalance(
      connection,
      commonVaultState.tokensReceiver,
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
    };
  };

  const stateBefore = await fetchState();

  const tx = await vaultsProgram.methods
    .mintInstant(toBN(amountToken), toBN(minReceiveAmount), referrerId)
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
      mintAuthority: stateBefore.minterVaultState.mintAuthorityPda,
    })
    .preInstructions([
      approveMintInstruction(
        paymentMint,
        from,
        getMinterVaultPda(baseAccounts.vaultCommon),
        amountToken
      ),
    ])
    .transaction();

  if (opt?.revertedWith) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState();
};

export const mintRequest = async (
  fixture: CommonVaultsParams,
  {
    amountToken,
    referrerId,
    paymentMint,
  }: {
    paymentMint?: PublicKey;
    amountToken?: bigint;
    referrerId?: number[];
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

  amountToken ??= parseUnits("10", fixture.paymentMints.usdc.decimals);
  referrerId ??= new Array(32).fill(0);
  paymentMint ??= fixture.paymentMints.usdc.mint;

  const baseAccounts = {
    vaultCommon: accounts?.commonVault ?? fixture.minterCommonVault.publicKey,
    ac: accounts?.ac ?? fixture.ac.publicKey,
  };

  const from = opt?.from ?? owner;

  const fetchState = async () => {
    const minterVaultState = await fetchMinterVaultState(
      vaultsProgram,
      getMinterVaultPda(baseAccounts.vaultCommon)
    );

    const commonVaultState = await fetchVaultCommonState(
      vaultsProgram,
      baseAccounts.vaultCommon
    );

    const commonVaultRequestState = await fetchMinterVaultRequestState(
      vaultsProgram,
      getMinterVaultRequestPda(
        getMinterVaultPda(baseAccounts.vaultCommon),
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

    const balanceFromPaymentMint = await getBalance(
      connection,
      from.publicKey,
      paymentMint
    );

    const balanceTokensReceiverPaymentMint = await getBalance(
      connection,
      commonVaultState.tokensReceiver,
      paymentMint
    );

    const balanceFeeReceiverPaymentMint = await getBalance(
      connection,
      commonVaultState.tokensReceiver,
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
      commonVaultRequestState,
    };
  };

  const stateBefore = await fetchState();

  const tx = await vaultsProgram.methods
    .mintRequest(toBN(amountToken), referrerId)
    .accountsPartial({
      ...baseAccounts,

      mMintFeed: stateBefore.mMintFeed.underlyingFeed,
      mMintDataFeed: stateBefore.commonVaultState.mMintFeed,
      signer: from.publicKey,
      paymentMint: paymentMint,
      paymentMintDataFeed: stateBefore.paymentTokenState.dataFeed,
      paymentMintFeed: stateBefore.paymentTokenFeed.underlyingFeed,
      paymentMintTokenProgram: TOKEN_PROGRAM_ID,
      mintRequest: getMinterVaultRequestPda(
        getMinterVaultPda(baseAccounts.vaultCommon),
        fromBN(stateBefore.commonVaultState.requestsCount)
      ),
    })
    .preInstructions([
      approveMintInstruction(
        paymentMint,
        from,
        getMinterVaultPda(baseAccounts.vaultCommon),
        amountToken
      ),
    ])
    .transaction();

  if (opt?.revertedWith) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState();

  expect(stateAfter.commonVaultRequestState).not.toEqual(null);
};

export const approveMintRequest = async (
  fixture: CommonVaultsParams,
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
    vaultCommon: accounts?.commonVault ?? fixture.minterCommonVault.publicKey,
  };

  const from = opt?.from ?? owner;

  const fetchState = async (user?: PublicKey) => {
    const minterVaultState = await fetchMinterVaultState(
      vaultsProgram,
      getMinterVaultPda(baseAccounts.vaultCommon)
    );

    const commonVaultState = await fetchVaultCommonState(
      vaultsProgram,
      baseAccounts.vaultCommon
    );

    const requestState = await fetchMinterVaultRequestState(
      vaultsProgram,
      getMinterVaultRequestPda(
        getMinterVaultPda(baseAccounts.vaultCommon),
        requestId
      ),
      true
    );

    const balanceFromMToken = await getBalance(
      connection,
      user ?? requestState.user,
      commonVaultState.mMint,
      TOKEN_2022_PROGRAM_ID
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
    .approveMintRequest(toBN(requestId), toBN(newRate), isSafe)
    .accountsPartial({
      ...baseAccounts,
      authority: from.publicKey,
      mintRequest: getMinterVaultRequestPda(
        getMinterVaultPda(baseAccounts.vaultCommon),
        requestId
      ),
      mintAuthority: stateBefore.minterVaultState.mintAuthorityPda,
      userAccount: user,
      mMint: stateBefore.commonVaultState.mMint,
      mMintTokenProgram: TOKEN_2022_PROGRAM_ID,
    })
    .transaction();

  if (opt?.revertedWith) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState(user);

  expect(stateAfter.requestState).toEqual(null);
};

export const rejectMintRequest = async (
  fixture: CommonVaultsParams,
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
    vaultCommon: accounts?.commonVault ?? fixture.minterCommonVault.publicKey,
  };

  const from = opt?.from ?? owner;

  const fetchState = async (user?: PublicKey) => {
    const minterVaultState = await fetchMinterVaultState(
      vaultsProgram,
      getMinterVaultPda(baseAccounts.vaultCommon)
    );

    const commonVaultState = await fetchVaultCommonState(
      vaultsProgram,
      baseAccounts.vaultCommon
    );

    const requestState = await fetchMinterVaultRequestState(
      vaultsProgram,
      getMinterVaultRequestPda(
        getMinterVaultPda(baseAccounts.vaultCommon),
        requestId
      ),
      true
    );

    const balanceFromMToken = await getBalance(
      connection,
      user ?? requestState.user,
      commonVaultState.mMint,
      TOKEN_2022_PROGRAM_ID
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
      mintRequest: getMinterVaultRequestPda(
        getMinterVaultPda(baseAccounts.vaultCommon),
        requestId
      ),
      userAccount: user,
    })
    .transaction();

  if (opt?.revertedWith) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState(user);

  expect(stateAfter.requestState).toEqual(null);
};

export const redeemInstant = async (
  fixture: CommonVaultsParams,
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

  if (opt?.revertedWith) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState();
};

export const redeemRequest = async (
  fixture: CommonVaultsParams,
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

  // console.log({
  //   from: findATA(
  //     stateBefore.commonVaultState.mMint,
  //     from.publicKey,
  //     TOKEN_2022_PROGRAM_ID
  //   ).toBase58(),
  //   to: findATA(
  //     stateBefore.commonVaultState.mMint,
  //     getRedeemerVaultPda(fixture.redeemerCommonVault.publicKey),
  //     TOKEN_2022_PROGRAM_ID
  //   ).toBase58(),
  //   authority: from.publicKey.toBase58(),
  //   mint: stateBefore.commonVaultState.mMint.toBase58(),
  // });

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

  if (opt?.revertedWith) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState();

  expect(stateAfter.requestState).not.toEqual(null);
};

export const approveRedeemRequest = async (
  fixture: CommonVaultsParams,
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

  // console.log({
  //   from: findATA(
  //     stateBefore.requestState.paymentMint,
  //     getRedeemerVaultRedeemerPda(baseAccounts.vaultCommon)
  //   ).toBase58(),
  //   to: findATA(
  //     stateBefore.requestState.paymentMint,
  //     fixture.authority.publicKey
  //   ).toBase58(),
  //   authority: getRedeemerVaultRedeemerPda(baseAccounts.vaultCommon).toBase58(),
  //   mint: stateBefore.requestState.paymentMint.toBase58(),
  // });

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
      // requestRedeemer: stateBefore.redeemerVaultState.requestRedeemer,
    })
    .transaction();

  if (opt?.revertedWith) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState(user);

  expect(stateAfter.requestState).toEqual(null);
};

export const rejectRedeemRequest = async (
  fixture: CommonVaultsParams,
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
    })
    .transaction();

  if (opt?.revertedWith) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState(user);

  expect(stateAfter.requestState).toEqual(null);
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
    vaultCommonState:
      accounts?.commonVault ?? fixture.minterCommonVault.publicKey,
  };

  const fetchState = async () => {
    const paymentTokenState = await fetchPaymentMintState(
      vaultsProgram,
      getPaymentMintStatePda(baseAccounts.vaultCommonState, mint),
      true
    );

    return {
      paymentTokenState,
    };
  };

  const stateBefore = await fetchState();

  const from = opt?.from ?? owner;

  const tx = await vaultsProgram.methods
    .addPaymentToken(toBN(fee), toBN(allowance), stable)
    .accountsPartial({
      ...baseAccounts,
      authority: from.publicKey,
      dataFeed: dataFeed,
      paymentMint: mint,
    })
    .transaction();

  if (opt?.revertedWith) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState();

  expect(stateAfter).not.toEqual(null);
  expect(stateAfter.paymentTokenState.allowance.eq(toBN(allowance))).toBe(true);
  expect(stateAfter.paymentTokenState.fee.eq(toBN(fee))).toBe(true);
  expect(stateAfter.paymentTokenState.dataFeed.equals(dataFeed)).toBe(true);
  expect(stateAfter.paymentTokenState.stable).toBe(stable);
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
    vaultCommonState:
      accounts?.commonVault ?? fixture.minterCommonVault.publicKey,
  };

  const fetchState = async () => {
    const vaultCommonAccount = await fetchVaultCommonAccountState(
      vaultsProgram,
      getCommonVaultAccountStatePda(baseAccounts.vaultCommonState, account),
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

  if (opt?.revertedWith) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState();

  expect(stateAfter).not.toEqual(null);
  expect(stateAfter.vaultCommonAccount.freeFromMinAmount).toBe(false);
  expect(stateAfter.vaultCommonAccount.freeFromMinFirstMint).toBe(false);
  expect(stateAfter.vaultCommonAccount.waivedFee).toBe(false);
};

export const newMintAuthority = async (
  fixture: Pick<CommonVaultsParams, "vaultsProgram" | "authority" | "context">,
  {
    seed,
    authority,
  }: {
    seed?: string;
    authority?: PublicKey;
  },
  opt?: OptionalCommonParams
) => {
  const { vaultsProgram, authority: owner, context } = fixture;
  const from = opt?.from ?? owner;

  seed ??= "mtbill-mint-authority";
  authority ??= owner.publicKey;

  const fetchState = async () => {
    const mintAuthority = await fetchMintAuthorityState(
      vaultsProgram,
      getMintAuthorityPda(seed),
      true
    );

    return {
      mintAuthority,
    };
  };

  const stateBefore = await fetchState();

  const tx = await vaultsProgram.methods
    .newMintAuthority(
      Array.from(Uint8Array.from(mintAuthoritySeedToBuffer(seed))),
      authority
    )
    .accountsPartial({
      signer: from.publicKey,
      mintAuthority: getMintAuthorityPda(seed),
    })
    .transaction();

  if (opt?.revertedWith) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState();

  expect(stateAfter).not.toEqual(null);
  expect(stateAfter.mintAuthority.authority.equals(authority)).toBe(true);
};

export const newAcAccount = async (
  fixture: CommonVaultsParams,
  {
    account,
  }: {
    account?: PublicKey;
  },
  accounts?: {
    ac?: PublicKey;
  },
  opt?: OptionalCommonParams
) => {
  const { dataFeedProgram, vaultsProgram, authority: owner, context } = fixture;
  const from = opt?.from ?? owner;

  account ??= from.publicKey;

  const baseAccounts = {
    ac: accounts?.ac ?? fixture.ac.publicKey,
  };

  const fetchState = async () => {
    const accountAcState = await fetchAccountAcState(
      vaultsProgram,
      getAccountAcStatePda(baseAccounts.ac, account),
      true
    );

    return {
      accountAcState,
    };
  };

  const stateBefore = await fetchState();

  const tx = await vaultsProgram.methods
    .newAccountAc()
    .accounts({
      ...baseAccounts,
      account,
      signer: from.publicKey,
    })
    .transaction();

  if (opt?.revertedWith) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState();

  expect(stateAfter).not.toEqual(null);
  expect(stateAfter.accountAcState.greenListed).toBe(false);
  expect(stateAfter.accountAcState.blackListed).toBe(false);
};

export const mintMToken = async (
  fixture: CommonVaultsParams,
  {
    mToken,
    to,
    amount,
  }: {
    mToken?: PublicKey;
    to?: PublicKey;
    amount?: bigint;
  }
) => {
  mToken ??= fixture.mTBillMint.publicKey;
  to ??= fixture.authority.publicKey;
  amount ??= parseUnits("10");

  // TODO: pass optional from
  const from = fixture.authority;

  const { ata } = await getOrCreateAta(
    fixture.context,
    fixture.provider.connection,
    mToken,
    to,
    from,
    TOKEN_2022_PROGRAM_ID
  );

  await processTransaction(
    fixture.context,

    await fixture.vaultsProgram.methods
      .mint(toBN(amount))
      .accountsPartial({
        mint: mToken,
        authority: fixture.authority.publicKey,
        mintAuthority: getMintAuthorityPda(fixture.mTBillMinterAuthoritySeed),
        receiver: to,
        receiverAta: ata,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .transaction(),
    [from]
  );
};

export const mintPaymentToken = async (
  fixture: CommonVaultsParams,
  {
    mint,
    to,
    amountBase9,
  }: {
    mint?: PaymentMint;
    to?: PublicKey;
    amountBase9?: bigint;
  }
) => {
  mint ??= fixture.paymentMints.usdc;
  to ??= fixture.authority.publicKey;
  amountBase9 ??= parseUnits("10");

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
      createMintToInstruction(mint.mint, ata, from.publicKey, amount)
    ),
    [from]
  );
};

export const mintPaymentTokenAndApprove = async (
  fixture: CommonVaultsParams,
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

export const prepareCommonRedeemTest = async (fixture: CommonVaultsParams) => {
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
  await newAcAccount(fixture, {});
};
