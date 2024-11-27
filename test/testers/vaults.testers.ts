import { Keypair, PublicKey } from "@solana/web3.js";
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
  fromBN,
  getBalance,
  OptionalCommonParams,
  parseUnits,
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
  fetchVaultCommonAccountState,
  fetchVaultCommonState,
  getAccountAcStatePda,
  getCommonVaultAccountStatePda,
  getMintAuthorityPda,
  getMinterVaultPda,
  getMinterVaultRequestPda,
  getPaymentMintStatePda,
  getReservePda,
  mintAuthoritySeedToBuffer,
} from "../helpers/vaults.helpers";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
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

  console.log({
    balance: await getBalance(fixture.connection, from.publicKey, paymentMint),
  });
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
      mintAuthority: getMintAuthorityPda(
        Buffer.from(stateBefore.minterVaultState.mintAuthorityPdaSeed)
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

  console.log({
    balance: await getBalance(fixture.connection, from.publicKey, paymentMint),
  });
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
  const { dataFeedProgram, vaultsProgram, authority: owner, context } = fixture;

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
  expect(stateAfter.vaultCommonAccount.freeFromMinFirstDeposit).toBe(false);
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
