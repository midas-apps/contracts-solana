import { Keypair, PublicKey } from '@solana/web3.js';

import { AC_ROLES } from '../constants/ac.constants';
import { AccessControlFixtureReturnType } from '../fixture/ac.fixture';
import {
  acRoleToBuffer,
  fetchAccountAcRoleState,
  fetchAccountAcState,
  fetchAcRoleState,
  fetchAcState,
  generateAcAccount,
  generateAcRoleAccount,
  getAccountAcRoleStatePda,
  getAccountAcStatePda,
} from '../helpers/ac.helpers';
import {
  expectTxNotReverted,
  expectTxReverted,
  OptionalCommonParams,
} from '../helpers/common.helpers';

type CommonAcParams = AccessControlFixtureReturnType;

export const newAccountAc = async (
  fixture: CommonAcParams,
  {
    account,
  }: {
    account?: PublicKey;
  },
  accounts?: {
    ac?: PublicKey;
  },
  opt?: OptionalCommonParams,
) => {
  const { acProgram, authority: owner, context } = fixture;
  const from = opt?.from ?? owner;

  account ??= from.publicKey;

  const baseAccounts = {
    ac: accounts?.ac ?? fixture.ac.publicKey,
  };

  const fetchState = async () => {
    const accountAcState = await fetchAccountAcState(
      acProgram,
      getAccountAcStatePda(baseAccounts.ac, account),
      true,
    );

    return {
      accountAcState,
    };
  };

  const stateBefore = await fetchState();

  const tx = await acProgram.methods
    .newAccountAc()
    .accountsPartial({
      ...baseAccounts,
      account,
      signer: from.publicKey,
      accountAc: getAccountAcStatePda(baseAccounts.ac, account),
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState();

  expect(stateBefore.accountAcState).toEqual(null);
  expect(stateAfter.accountAcState).not.toEqual(null);
  expect(stateAfter.accountAcState.greenListed).toBe(false);
  expect(stateAfter.accountAcState.blackListed).toBe(false);
};

export const updateAccountAc = async (
  fixture: CommonAcParams,
  {
    account,
    ac,
    blackListed,
    greenListed,
  }: {
    account?: PublicKey;
    ac?: PublicKey;
    greenListed?: boolean;
    blackListed?: boolean;
  },
  opt?: OptionalCommonParams,
) => {
  const { acProgram, authority: owner, context, ac: acKeypair } = fixture;
  const from = opt?.from ?? owner;

  account ??= from.publicKey;
  ac ??= acKeypair.publicKey;

  blackListed ??= null;
  greenListed ??= null;

  const fetchState = async () => {
    const accountAcState = await fetchAccountAcState(
      acProgram,
      getAccountAcStatePda(ac, account),
      true,
    );
    const acState = await fetchAcState(acProgram, ac);

    return {
      accountAcState,
      acState,
    };
  };

  const stateBefore = await fetchState();

  const tx = await acProgram.methods
    .updateAccountAc(greenListed, blackListed)
    .accountsPartial({
      account,
      ac,
      authority: from.publicKey,
      accountAc: getAccountAcStatePda(ac, account),
      authorityAcRole: getAccountAcRoleStatePda(
        stateBefore.acState.acRole,
        account,
        AC_ROLES.UPDATE_ACCOUNT_AC,
      ),
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState();

  if (greenListed !== null) {
    expect(stateAfter.accountAcState.greenListed).toBe(greenListed);
  }

  if (blackListed !== null) {
    expect(stateAfter.accountAcState.blackListed).toBe(blackListed);
  }
};

export const newAcRole = async (
  fixture: CommonAcParams,
  {
    acRole,
  }: {
    acRole?: Keypair;
  },
  opt?: OptionalCommonParams,
) => {
  const { acProgram, authority: owner, context } = fixture;
  const from = opt?.from ?? owner;

  acRole ??= generateAcRoleAccount();

  const fetchState = async () => {
    const acRoleState = await fetchAcRoleState(acProgram, acRole.publicKey, true);
    const accountAcRoleState = await fetchAccountAcRoleState(
      acProgram,
      getAccountAcRoleStatePda(acRole.publicKey, from.publicKey, AC_ROLES.ADMIN),
      true,
    );

    return {
      acRoleState,
      accountAcRoleState,
    };
  };

  const stateBefore = await fetchState();

  const tx = await acProgram.methods
    .newAcRole()
    .accountsPartial({
      acRole: acRole.publicKey,
      authority: from.publicKey,
      accountAcRole: getAccountAcRoleStatePda(acRole.publicKey, from.publicKey, AC_ROLES.ADMIN),
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from, acRole], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from, acRole]);

  const stateAfter = await fetchState();

  expect(stateBefore.acRoleState).toEqual(null);
  expect(stateBefore.accountAcRoleState).toEqual(null);

  expect(stateAfter.acRoleState).not.toEqual(null);
  expect(stateAfter.accountAcRoleState).not.toEqual(null);
};

export const newAc = async (
  fixture: CommonAcParams,
  {
    acRole,
    ac,
  }: {
    acRole?: PublicKey;
    ac?: Keypair;
  },
  opt?: OptionalCommonParams,
) => {
  const { acProgram, authority: owner, context } = fixture;
  const from = opt?.from ?? owner;

  acRole ??= fixture.acRoleGlobal.publicKey;
  ac ??= generateAcAccount();

  const fetchState = async () => {
    const acState = await fetchAcState(acProgram, ac.publicKey, true);

    return {
      acState,
    };
  };

  const stateBefore = await fetchState();

  const tx = await acProgram.methods
    .newAc()
    .accountsPartial({
      acRole: acRole,
      ac: ac.publicKey,
      payer: from.publicKey,
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from, ac], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from, ac]);

  const stateAfter = await fetchState();

  expect(stateBefore.acState).toEqual(null);

  expect(stateAfter.acState).not.toEqual(null);

  expect(stateAfter.acState.acRole.equals(acRole)).toBe(true);
};

export const grantRole = async (
  fixture: CommonAcParams,
  {
    account,
    acRole,
    role,
  }: {
    account?: PublicKey;
    acRole?: PublicKey;
    role?: string;
  },
  opt?: OptionalCommonParams,
) => {
  const { acProgram, authority: owner, context, acRoleGlobal } = fixture;
  const from = opt?.from ?? owner;

  account ??= from.publicKey;
  acRole ??= acRoleGlobal.publicKey;
  role ??= AC_ROLES.ADMIN;

  const fetchState = async () => {
    const accountAcRoleState = await fetchAccountAcRoleState(
      acProgram,
      getAccountAcRoleStatePda(acRole, account, role),
      true,
    );

    return {
      accountAcRoleState,
    };
  };

  const stateBefore = await fetchState();

  const tx = await acProgram.methods
    .grantRole(acRoleToBuffer(role))
    .accountsPartial({
      authority: from.publicKey,
      account: account,
      accountAcRole: getAccountAcRoleStatePda(acRole, account, role),
      authorityAcAdminRole: getAccountAcRoleStatePda(acRole, from.publicKey, AC_ROLES.ADMIN),
      acRole,
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState();

  expect(stateBefore.accountAcRoleState).toEqual(null);

  expect(stateAfter.accountAcRoleState).not.toEqual(null);
};

export const revokeRole = async (
  fixture: CommonAcParams,
  {
    account,
    acRole,
    role,
  }: {
    account?: PublicKey;
    acRole?: PublicKey;
    role?: string;
  },
  opt?: OptionalCommonParams,
) => {
  const { acProgram, authority: owner, context, acRoleGlobal } = fixture;
  const from = opt?.from ?? owner;

  account ??= from.publicKey;
  acRole ??= acRoleGlobal.publicKey;
  role ??= AC_ROLES.ADMIN;

  const fetchState = async () => {
    const accountAcRoleState = await fetchAccountAcRoleState(
      acProgram,
      getAccountAcRoleStatePda(acRole, account, role),
      true,
    );

    return {
      accountAcRoleState,
    };
  };

  const stateBefore = await fetchState();

  const tx = await acProgram.methods
    .revokeRole(acRoleToBuffer(role))
    .accountsPartial({
      authority: from.publicKey,
      account: account,
      accountAcRole: getAccountAcRoleStatePda(acRole, account, role),
      authorityAcAdminRole: getAccountAcRoleStatePda(acRole, from.publicKey, AC_ROLES.ADMIN),
      acRole,
    })
    .transaction();

  if (opt?.revertedWith !== undefined) {
    await expectTxReverted(context, tx, [from], opt);
    return;
  }

  await expectTxNotReverted(context, tx, [from]);

  const stateAfter = await fetchState();

  expect(stateBefore.accountAcRoleState).not.toEqual(null);

  expect(stateAfter.accountAcRoleState).toEqual(null);
};
