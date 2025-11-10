import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { PublicKey, sendAndConfirmTransaction } from '@solana/web3.js';

import { isAccountNotFoundError } from '@/common/errorHandler';
import { TokenAuthority } from '@/target/types/token_authority';
import {
  getTokenAuthorityPda,
  mintAuthoritySeedToBuffer,
} from '@/test/helpers/token-authority.helpers';

import TOKEN_AUTHORITY_IDL from '../../target/idl/token_authority.json' with { type: 'json' };

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

  try {
    const existingAuthority =
      await tokenAuthorityProgram.account.tokenAuthorityState.fetch(authority);
    if (!existingAuthority.acRole.equals(acRole)) {
      console.warn(
        `⚠️  Token authority already exists with different acRole: ${existingAuthority.acRole.toString()} (expected: ${acRole.toString()}). Reusing existing authority.`,
      );
    }
    return authority;
  } catch (error) {
    if (isAccountNotFoundError(error)) {
      // Account doesn't exist, proceed with initialization
    } else {
      throw error;
    }
  }

  const tx = await tokenAuthorityProgram.methods
    .newTokenAuthority(Array.from(Uint8Array.from(mintAuthoritySeedToBuffer(seed))), acRole)
    .accountsPartial({
      signer: common.payer.publicKey,
      tokenAuthority: authority,
    })
    .transaction();

  await sendAndConfirmTransaction(common.provider.connection, tx, [common.payer], {
    commitment: 'finalized',
  });

  return authority;
};
