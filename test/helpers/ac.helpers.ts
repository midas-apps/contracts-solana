import { Keypair, PublicKey } from '@solana/web3.js';

import { AC_PROGRAM_ID, AC_SEEDS } from '../constants/ac.constants';

import { AccessControlProgram, fetchAccountNullable, findPDA } from './common.helpers';

export const DataFeedMode = {
  manual: { manual: {} },
  switchboard: { switchboard: {} },
};
export const generateAcAccount = () => {
  return Keypair.generate();
};

export const generateAcRoleAccount = () => {
  return Keypair.generate();
};

export const fetchAcState = async (
  program: AccessControlProgram,
  ac: PublicKey,
  allowNull = false,
) => {
  return fetchAccountNullable(ac, program.account.accessControlState, allowNull);
};

export const fetchAccountAcState = async (
  program: AccessControlProgram,
  accountAc: PublicKey,
  allowNull = false,
) => {
  return fetchAccountNullable(accountAc, program.account.accountAccessControlState, allowNull);
};

export const fetchAcRoleState = async (
  program: AccessControlProgram,
  accountAc: PublicKey,
  allowNull = false,
) => {
  return fetchAccountNullable(accountAc, program.account.accessControlRoleState, allowNull);
};

export const fetchAccountAcRoleState = async (
  program: AccessControlProgram,
  accountAc: PublicKey,
  allowNull = false,
) => {
  return fetchAccountNullable(accountAc, program.account.accountAccessControlRoleState, allowNull);
};

export const acRoleToBuffer = (role: string) => {
  return Buffer.from(role);
};

export const getAccountAcRoleStatePda = (acRole: PublicKey, account: PublicKey, role: string) => {
  const [pda] = findPDA(
    [AC_SEEDS.ACCOUNT_AC_ROLE, acRole, account, acRoleToBuffer(role)],
    AC_PROGRAM_ID,
  );
  return pda;
};

export const getAccountAcStatePda = (ac: PublicKey, account: PublicKey) => {
  const [pda] = findPDA([AC_SEEDS.ACCOUNT_AC, ac, account], AC_PROGRAM_ID);
  return pda;
};
