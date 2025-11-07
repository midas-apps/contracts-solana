import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { PublicKey, sendAndConfirmTransaction } from '@solana/web3.js';

import { TokenAuthority } from '@/target/types/token_authority';
import {
  getTokenAuthorityPda,
  mintAuthoritySeedToBuffer,
} from '@/test/helpers/token-authority.helpers';

import * as TOKEN_AUTHORITY_IDL from '../../../target/idl/token_authority.json';

import { CommonParams } from './dataFeed';

export const getTokenAuthorityProgram = (provider: AnchorProvider) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Program<TokenAuthority>(TOKEN_AUTHORITY_IDL as any, provider);
};

export interface DeployTokenAuthorityConfig {
  acRole: PublicKey;
  seed: string;
}

export const deployTokenAuthority = async (
  common: CommonParams,
  { acRole, seed }: DeployTokenAuthorityConfig,
) => {
  const tokenAuthorityProgram = getTokenAuthorityProgram(common.provider);

  const authority = getTokenAuthorityPda(seed);
  const tx = await tokenAuthorityProgram.methods
    .newTokenAuthority(Array.from(Uint8Array.from(mintAuthoritySeedToBuffer(seed))), acRole)
    .accountsPartial({
      signer: common.payer.publicKey,
      tokenAuthority: getTokenAuthorityPda(seed),
    })
    .transaction();

  await sendAndConfirmTransaction(common.provider.connection, tx, [common.payer], {
    commitment: 'finalized',
  });

  return authority;
};
