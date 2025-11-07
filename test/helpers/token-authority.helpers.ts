import { Keypair, PublicKey } from '@solana/web3.js';
import keccak256 from 'keccak256';

import {
  TOKEN_AUTHORITY_PROGRAM_ID,
  TOKEN_AUTHORITY_SEEDS,
} from '../constants/token-authority.constants';

import { fetchAccountNullable, findPDA, TokenAuthorityProgram } from './common.helpers';

export interface PaymentMint {
  mint: PublicKey;
  feed: Keypair;
  decimals: number;
}

export const fetchTokenAuthorityState = async (
  program: TokenAuthorityProgram,
  tokenAuthority: PublicKey,
  allowNull = false,
) => {
  return fetchAccountNullable(tokenAuthority, program.account.tokenAuthorityState, allowNull);
};

export const mintAuthoritySeedToBuffer = (seed: string) => {
  return keccak256(Buffer.from(seed));
};

export const getTokenAuthorityPda = (seed: string | Buffer) => {
  const buff = seed instanceof Buffer ? seed : mintAuthoritySeedToBuffer(seed as string);

  const [pda] = findPDA([TOKEN_AUTHORITY_SEEDS.MINT_AUTHORITY, buff], TOKEN_AUTHORITY_PROGRAM_ID);
  return pda;
};
