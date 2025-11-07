import { PublicKey } from '@solana/web3.js';

import * as ACCESS_CONTROL_IDL from '../../target/idl/access_control.json';

export const AC_PROGRAM_ID = new PublicKey(ACCESS_CONTROL_IDL.address);

export const AC_SEEDS = {
  ACCOUNT_AC: 'account_ac',
  ACCOUNT_AC_ROLE: 'account_ac_role',
};

export const AC_ROLES = {
  ADMIN: 'admin_role',
  UPDATE_ACCOUNT_AC: 'update_account_ac_role',
};

export enum AcError {
  NotAuthority = 6000,
  BothBlacklistedAndWhitelisted,
}
