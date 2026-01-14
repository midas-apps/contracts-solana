import { AuthorityType, getMint, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { Keypair, PublicKey } from '@solana/web3.js';

import { AC_ROLES } from '../constants/ac.constants';
import { TOKEN_AUTHORITY_ROLES } from '../constants/token-authority.constants';
import { TokenAuthorityFixtureReturnType } from '../fixture/token-authority.fixture';
import { getAccountAcRoleStatePda } from '../helpers/ac.helpers';
import {
  expectTxNotReverted,
  expectTxReverted,
  getBalance,
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
  }: {
    mToken?: PublicKey;
    to?: PublicKey;
    amount?: bigint;
  },
  opt?: OptionalCommonParams,
) => {
  mToken ??= fixture.mTBillMint.publicKey;
  to ??= fixture.authority.publicKey;
  amount ??= parseUnits('10');

  const from = opt?.from ?? fixture.authority;

  const { ata } = await getOrCreateAta(
    fixture.context,
    fixture.provider.connection,
    mToken,
    to,
    from,
    TOKEN_2022_PROGRAM_ID,
  );

  const fetchState = async () => {
    const minterState = await fetchTokenAuthorityState(
      fixture.tokenAuthorityProgram,
      getTokenAuthorityPda(fixture.mTBillMinterAuthoritySeed),
    );

    const balanceReceiver = await getBalance(
      fixture.provider.connection,
      to,
      mToken,
      TOKEN_2022_PROGRAM_ID,
    );

    const mintState = await getMint(
      fixture.provider.connection,
      mToken,
      undefined,
      TOKEN_2022_PROGRAM_ID,
    );

    return {
      minterState,
      mintState,
      balanceReceiver,
    };
  };

  const stateBefore = await fetchState();

  const tx = await fixture.tokenAuthorityProgram.methods
    .mint(toBN(amount))
    .accountsPartial({
      mint: mToken,
      authority: from.publicKey,
      tokenAuthority: getTokenAuthorityPda(fixture.mTBillMinterAuthoritySeed),
      receiver: to,
      receiverAta: ata,
      authorityMinterRole: getAccountAcRoleStatePda(
        stateBefore.minterState.acRole,
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
  }: {
    address?: PublicKey;
    mint?: PublicKey;
    tokenProgram?: PublicKey;
    amount?: bigint;
  },
  opt?: OptionalCommonParams,
) => {
  mint ??= fixture.mTBillMint.publicKey;
  tokenProgram ??= TOKEN_2022_PROGRAM_ID;
  amount ??= parseUnits('10');
  address ??= fixture.authority.publicKey;

  const { ata } = await getOrCreateAta(
    fixture.context,
    fixture.provider.connection,
    mint,
    address,
    fixture.authority,
    tokenProgram,
  );

  const from = opt?.from ?? fixture.authority;

  const fetchState = async () => {
    const minterState = await fetchTokenAuthorityState(
      fixture.tokenAuthorityProgram,
      getTokenAuthorityPda(fixture.mTBillMinterAuthoritySeed),
    );

    const balanceAccount = await getBalance(
      fixture.provider.connection,
      address,
      mint,
      TOKEN_2022_PROGRAM_ID,
    );

    return {
      minterState,
      balanceAccount,
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
      from: address,
      fromAta: ata,
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
  }: {
    toFreeze?: PublicKey;
    mint?: PublicKey;
    tokenProgram?: PublicKey;
    amount?: bigint;
  },
  opt?: OptionalCommonParams,
) => {
  mint ??= fixture.mTBillMint.publicKey;
  tokenProgram ??= TOKEN_2022_PROGRAM_ID;
  amount ??= parseUnits('10');
  toFreeze ??= fixture.authority.publicKey;

  const { ata } = await getOrCreateAta(
    fixture.context,
    fixture.provider.connection,
    mint,
    toFreeze,
    fixture.authority,
    tokenProgram,
  );

  const from = opt?.from ?? fixture.authority;

  const fetchState = async () => {
    const minterState = await fetchTokenAuthorityState(
      fixture.tokenAuthorityProgram,
      getTokenAuthorityPda(fixture.mTBillMinterAuthoritySeed),
    );

    const account = await getOrCreateAta(
      fixture.context,
      fixture.provider.connection,
      mint,
      toFreeze,
      from,
      TOKEN_2022_PROGRAM_ID,
    );

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
      toFreeze: toFreeze,
      toFreezeAta: ata,
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(fixture.context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(fixture.context, tx, [from]);

  const stateAfter = await fetchState();

  expect(stateAfter.account.ataAccount.isFrozen).toEqual(true);
};

export const thawAccount = async (
  fixture: CommonTokenAuthorityParams & { mTBillMint: Keypair },
  {
    toThaw,
    amount,
    mint,
    tokenProgram,
  }: {
    toThaw?: PublicKey;
    mint?: PublicKey;
    tokenProgram?: PublicKey;
    amount?: bigint;
  },
  opt?: OptionalCommonParams,
) => {
  mint ??= fixture.mTBillMint.publicKey;
  tokenProgram ??= TOKEN_2022_PROGRAM_ID;
  amount ??= parseUnits('10');
  toThaw ??= fixture.authority.publicKey;

  const { ata } = await getOrCreateAta(
    fixture.context,
    fixture.provider.connection,
    mint,
    toThaw,
    fixture.authority,
    tokenProgram,
  );

  const from = opt?.from ?? fixture.authority;

  const fetchState = async () => {
    const minterState = await fetchTokenAuthorityState(
      fixture.tokenAuthorityProgram,
      getTokenAuthorityPda(fixture.mTBillMinterAuthoritySeed),
    );

    const account = await getOrCreateAta(
      fixture.context,
      fixture.provider.connection,
      mint,
      toThaw,
      from,
      TOKEN_2022_PROGRAM_ID,
    );

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
      toThaw: toThaw,
      toThawAta: ata,
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(fixture.context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(fixture.context, tx, [from]);

  const stateAfter = await fetchState();

  expect(stateAfter.account.ataAccount.isFrozen).toEqual(false);
};
