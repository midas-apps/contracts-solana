import { AuthorityType, getAccount, getMint, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { Keypair, PublicKey } from '@solana/web3.js';

import { AC_ROLES } from '../constants/ac.constants';
import { TOKEN_AUTHORITY_ROLES } from '../constants/token-authority.constants';
import { TokenAuthorityFixtureReturnType } from '../fixture/token-authority.fixture';
import { getAccountAcRoleStatePda } from '../helpers/ac.helpers';
import {
  expectTxNotReverted,
  expectTxReverted,
  getOrCreateAta,
  OptionalCommonParams,
  parseUnits,
  toBN,
} from '../helpers/common.helpers';
import {
  fetchTokenAuthorityState,
  getTokenAuthorityPda,
  mintAuthoritySeedToBuffer,
} from '../helpers/token-authority.helpers';

type CommonTokenAuthorityParams = TokenAuthorityFixtureReturnType;

const resolveTokenAccount = async (
  fixture: CommonTokenAuthorityParams,
  mint: PublicKey,
  owner: PublicKey,
  tokenAccount: PublicKey | undefined,
  tokenProgram: PublicKey,
) => {
  if (tokenAccount) {
    return tokenAccount;
  }

  const { ata } = await getOrCreateAta(
    fixture.context,
    fixture.provider.connection,
    mint,
    owner,
    fixture.authority,
    tokenProgram,
  );

  return ata;
};

const fetchTokenAccount = async (
  fixture: CommonTokenAuthorityParams,
  tokenAccount: PublicKey,
  tokenProgram: PublicKey,
) => {
  return getAccount(fixture.provider.connection, tokenAccount, undefined, tokenProgram);
};

export const newTokenAuthority = async (
  fixture: CommonTokenAuthorityParams,
  {
    seed,
    acRole,
  }: {
    seed?: string;
    acRole?: PublicKey;
  },
  opt?: OptionalCommonParams,
) => {
  const { context, tokenAuthorityProgram, authority, acRoleMTbill } = fixture;
  const from = opt?.from ?? authority;

  seed ??= 'mtbill-mint-authority';
  acRole ??= acRoleMTbill.publicKey;

  const fetchState = async () => {
    const tokenAuthority = await fetchTokenAuthorityState(
      tokenAuthorityProgram,
      getTokenAuthorityPda(seed),
      true,
    );

    return {
      tokenAuthority,
    };
  };

  await fetchState();

  const tx = await tokenAuthorityProgram.methods
    .newTokenAuthority(Array.from(Uint8Array.from(mintAuthoritySeedToBuffer(seed))), acRole)
    .accountsPartial({
      signer: from.publicKey,
      tokenAuthority: getTokenAuthorityPda(seed),
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState();

  expect(stateAfter).not.toEqual(null);
  expect(stateAfter.tokenAuthority.acRole.equals(acRole)).toBe(true);
};

export const mintMToken = async (
  fixture: CommonTokenAuthorityParams & { mTBillMint: Keypair },
  {
    mToken,
    to,
    amount,
    tokenAccount,
  }: {
    mToken?: PublicKey;
    to?: PublicKey;
    amount?: bigint;
    tokenAccount?: PublicKey;
  },
  opt?: OptionalCommonParams,
) => {
  mToken ??= fixture.mTBillMint.publicKey;
  to ??= fixture.authority.publicKey;
  amount ??= parseUnits('10');

  const from = opt?.from ?? fixture.authority;
  const destination = await resolveTokenAccount(
    fixture,
    mToken,
    to,
    tokenAccount,
    TOKEN_2022_PROGRAM_ID,
  );

  const fetchState = async () => {
    const minterState = await fetchTokenAuthorityState(
      fixture.tokenAuthorityProgram,
      getTokenAuthorityPda(fixture.mTBillMinterAuthoritySeed),
    );

    const receiverAccount = await fetchTokenAccount(fixture, destination, TOKEN_2022_PROGRAM_ID);

    const mintState = await getMint(
      fixture.provider.connection,
      mToken,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    return {
      minterState,
      mintState,
      balanceReceiver: receiverAccount.amount,
    };
  };

  const stateBefore = await fetchState();

  const tx = await fixture.tokenAuthorityProgram.methods
    .mint(toBN(amount))
    .accountsPartial({
      mint: mToken,
      authority: from.publicKey,
      tokenAuthority: getTokenAuthorityPda(fixture.mTBillMinterAuthoritySeed),
      receiverTokenAccount: destination,
      authorityMinterRole: getAccountAcRoleStatePda(
        stateBefore.minterState!.acRole,
        from.publicKey,
        TOKEN_AUTHORITY_ROLES.M_MINTER,
      ),
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(fixture.context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(fixture.context, tx, [from]);

  const stateAfter = await fetchState();

  expect(stateAfter.balanceReceiver).toEqual(stateBefore.balanceReceiver + amount);

  expect(stateAfter.mintState.supply).toEqual(stateBefore.mintState.supply + amount);
};

export const setAuthority = async (
  fixture: CommonTokenAuthorityParams & { mTBillMint: Keypair },
  {
    accountOrMint,
    authorityType,
    newAuthority,
  }: {
    accountOrMint?: PublicKey;
    newAuthority?: PublicKey;
    authorityType?: AuthorityType;
  },
  opt?: OptionalCommonParams,
) => {
  accountOrMint ??= fixture.mTBillMint.publicKey;
  authorityType ??= AuthorityType.MintTokens;
  newAuthority ??= fixture.regularAccounts[0]?.publicKey;

  const from = opt?.from ?? fixture.authority;

  const fetchState = async () => {
    const minterState = await fetchTokenAuthorityState(
      fixture.tokenAuthorityProgram,
      getTokenAuthorityPda(fixture.mTBillMinterAuthoritySeed),
    );

    return {
      minterState,
    };
  };

  const stateBefore = await fetchState();

  const tx = await fixture.tokenAuthorityProgram.methods
    .setAuthority(authorityType, newAuthority)
    .accountsPartial({
      authority: from.publicKey,
      tokenAuthority: getTokenAuthorityPda(fixture.mTBillMinterAuthoritySeed),
      authorityAdminRole: getAccountAcRoleStatePda(
        stateBefore.minterState.acRole,
        from.publicKey,
        AC_ROLES.ADMIN,
      ),
      accountOrMint: accountOrMint,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(fixture.context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(fixture.context, tx, [from]);
};

export const burnToken = async (
  fixture: CommonTokenAuthorityParams & { mTBillMint: Keypair },
  {
    address,
    amount,
    mint,
    tokenProgram,
    tokenAccount,
  }: {
    address?: PublicKey;
    mint?: PublicKey;
    tokenProgram?: PublicKey;
    amount?: bigint;
    tokenAccount?: PublicKey;
  },
  opt?: OptionalCommonParams,
) => {
  mint ??= fixture.mTBillMint.publicKey;
  tokenProgram ??= TOKEN_2022_PROGRAM_ID;
  amount ??= parseUnits('10');
  address ??= fixture.authority.publicKey;

  const from = opt?.from ?? fixture.authority;
  const source = await resolveTokenAccount(fixture, mint, address, tokenAccount, tokenProgram);

  const fetchState = async () => {
    const minterState = await fetchTokenAuthorityState(
      fixture.tokenAuthorityProgram,
      getTokenAuthorityPda(fixture.mTBillMinterAuthoritySeed),
    );

    const sourceAccount = await fetchTokenAccount(fixture, source, tokenProgram);

    return {
      minterState,
      balanceAccount: sourceAccount.amount,
    };
  };

  const stateBefore = await fetchState();

  const tx = await fixture.tokenAuthorityProgram.methods
    .burn(toBN(amount))
    .accountsPartial({
      authority: from.publicKey,
      tokenAuthority: getTokenAuthorityPda(fixture.mTBillMinterAuthoritySeed),
      authorityBurnRole: getAccountAcRoleStatePda(
        stateBefore.minterState.acRole,
        from.publicKey,
        TOKEN_AUTHORITY_ROLES.M_BURNER,
      ),
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      mint: mint,
      fromTokenAccount: source,
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(fixture.context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(fixture.context, tx, [from]);

  const stateAfter = await fetchState();

  expect(stateAfter.balanceAccount).toEqual(stateBefore.balanceAccount - amount);
};

export const freezeAccount = async (
  fixture: CommonTokenAuthorityParams & { mTBillMint: Keypair },
  {
    toFreeze,
    amount,
    mint,
    tokenProgram,
    tokenAccount,
  }: {
    toFreeze?: PublicKey;
    mint?: PublicKey;
    tokenProgram?: PublicKey;
    amount?: bigint;
    tokenAccount?: PublicKey;
  },
  opt?: OptionalCommonParams,
) => {
  mint ??= fixture.mTBillMint.publicKey;
  tokenProgram ??= TOKEN_2022_PROGRAM_ID;
  amount ??= parseUnits('10');
  toFreeze ??= fixture.authority.publicKey;

  const from = opt?.from ?? fixture.authority;
  const accountToFreeze = await resolveTokenAccount(
    fixture,
    mint,
    toFreeze,
    tokenAccount,
    tokenProgram,
  );

  const fetchState = async () => {
    const minterState = await fetchTokenAuthorityState(
      fixture.tokenAuthorityProgram,
      getTokenAuthorityPda(fixture.mTBillMinterAuthoritySeed),
    );

    const account = await fetchTokenAccount(fixture, accountToFreeze, tokenProgram);

    return {
      minterState,
      account,
    };
  };

  const stateBefore = await fetchState();

  const tx = await fixture.tokenAuthorityProgram.methods
    .freeze()
    .accountsPartial({
      authority: from.publicKey,
      tokenAuthority: getTokenAuthorityPda(fixture.mTBillMinterAuthoritySeed),
      authorityFreezeRole: getAccountAcRoleStatePda(
        stateBefore.minterState.acRole,
        from.publicKey,
        TOKEN_AUTHORITY_ROLES.M_FREEZER,
      ),
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      mint: mint,
      toFreezeTokenAccount: accountToFreeze,
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(fixture.context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(fixture.context, tx, [from]);

  const stateAfter = await fetchState();

  expect(stateAfter.account.isFrozen).toEqual(true);
};

export const thawAccount = async (
  fixture: CommonTokenAuthorityParams & { mTBillMint: Keypair },
  {
    toThaw,
    amount,
    mint,
    tokenProgram,
    tokenAccount,
  }: {
    toThaw?: PublicKey;
    mint?: PublicKey;
    tokenProgram?: PublicKey;
    amount?: bigint;
    tokenAccount?: PublicKey;
  },
  opt?: OptionalCommonParams,
) => {
  mint ??= fixture.mTBillMint.publicKey;
  tokenProgram ??= TOKEN_2022_PROGRAM_ID;
  amount ??= parseUnits('10');
  toThaw ??= fixture.authority.publicKey;

  const from = opt?.from ?? fixture.authority;
  const accountToThaw = await resolveTokenAccount(
    fixture,
    mint,
    toThaw,
    tokenAccount,
    tokenProgram,
  );

  const fetchState = async () => {
    const minterState = await fetchTokenAuthorityState(
      fixture.tokenAuthorityProgram,
      getTokenAuthorityPda(fixture.mTBillMinterAuthoritySeed),
    );

    const account = await fetchTokenAccount(fixture, accountToThaw, tokenProgram);

    return {
      minterState,
      account,
    };
  };

  const stateBefore = await fetchState();

  const tx = await fixture.tokenAuthorityProgram.methods
    .thaw()
    .accountsPartial({
      authority: from.publicKey,
      tokenAuthority: getTokenAuthorityPda(fixture.mTBillMinterAuthoritySeed),
      authorityFreezeRole: getAccountAcRoleStatePda(
        stateBefore.minterState.acRole,
        from.publicKey,
        TOKEN_AUTHORITY_ROLES.M_FREEZER,
      ),
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      mint: mint,
      toThawTokenAccount: accountToThaw,
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(fixture.context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(fixture.context, tx, [from]);

  const stateAfter = await fetchState();

  expect(stateAfter.account.isFrozen).toEqual(false);
};
