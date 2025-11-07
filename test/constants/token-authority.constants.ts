import { PublicKey } from '@solana/web3.js';

import * as TOKEN_AUTHORITY_IDL from '../../target/idl/token_authority.json';

export const TOKEN_AUTHORITY_PROGRAM_ID = new PublicKey(TOKEN_AUTHORITY_IDL.address);

export const TOKEN_AUTHORITY_SEEDS = {
  MINT_AUTHORITY: 'token_authority',
};

export const TOKEN_AUTHORITY_ROLES = {
  M_MINTER: 'm_minter_role',
  M_BURNER: 'm_burner_role',
  M_FREEZER: 'm_freezer_role',
};

export enum TokenAuthorityError {
  NotAuthority = 6000,
}
