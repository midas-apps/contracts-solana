import { AnchorProvider, Program } from '@coral-xyz/anchor';
import {
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from '@solana/web3.js';
import * as TOKEN_AUTHORITY_IDL from '../../../target/idl/token_authority.json';
import { CommonParams } from './common';
import { TokenAuthority } from '@/target/types/token_authority';
import {
  getTokenAuthorityPda,
  mintAuthoritySeedToBuffer,
} from '@/test/helpers/token-authority.helpers';
import { MTokenName } from '@/common/types/tokens';
import { getAddresses, getTokenAddresses } from '@/common/addresses';
import {
  AuthorityType,
  createApproveInstruction,
  createSetAuthorityInstruction,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { findATA } from '@/test/helpers/common.helpers';
import { MAX_U64 } from '@/test/constants/common.constants';

export const getTokenAuthorityProgram = (provider: AnchorProvider) => {
  return new Program<TokenAuthority>(TOKEN_AUTHORITY_IDL as any, provider);
};

export type DeployTokenAuthorityConfig = {
  acRole: PublicKey;
  seed: string;
};

export const deployTokenAuthority = async (
  common: CommonParams,
  token: MTokenName,
) => {
  const addresses = getAddresses(common.provider.network);
  const tokenAddresses = addresses[token];

  if (!tokenAddresses) {
    throw new Error('Token config is not found');
  }
  const {
    tokenAuthority: { seed },
    acRole,
  } = tokenAddresses;

  const tokenAuthorityProgram = getTokenAuthorityProgram(common.provider);

  const authority = getTokenAuthorityPda(seed);
  const tx = await tokenAuthorityProgram.methods
    .newTokenAuthority(
      Array.from(Uint8Array.from(mintAuthoritySeedToBuffer(seed))),
      acRole,
    )
    .accountsPartial({
      signer: common.payer.publicKey,
      tokenAuthority: getTokenAuthorityPda(seed),
    })
    .transaction();

  const txRes = await sendAndConfirmTransaction(
    common.provider.connection,
    tx,
    [common.payer],
    {
      commitment: 'finalized',
    },
  );

  console.log({
    txRes,
    authority,
    seed,
  });

  return authority;
};

export type TransferTokenAuthorityConfig = {
  authorityType: AuthorityType;
  currentAuthority?: PublicKey;
};

export const transferTokenAuthority = async (
  { provider, payer }: CommonParams,
  token: MTokenName,
  { authorityType, currentAuthority }: TransferTokenAuthorityConfig,
) => {
  const tokenAddresses = getTokenAddresses(provider.network, token);

  const { mToken: account, tokenProgram, tokenAuthority } = tokenAddresses;

  const txRes = await sendAndConfirmTransaction(
    provider.connection,
    new Transaction().add(
      createSetAuthorityInstruction(
        account,
        currentAuthority ?? payer.publicKey,
        authorityType,
        tokenAuthority.account ?? payer.publicKey,
        undefined,
        tokenProgram ?? TOKEN_2022_PROGRAM_ID,
      ),
    ),
    [payer],
    {
      commitment: 'finalized',
    },
  );

  console.log({ txRes });
};

export type DelegateTokenConfig = {
  mint: PublicKey;
};

export const delegateToken = async (
  { provider, payer }: CommonParams,
  token: MTokenName,
  { mint }: DelegateTokenConfig,
) => {
  const tokenAddresses = getTokenAddresses(provider.network, token);

  const tx = new Transaction().add(
    createApproveInstruction(
      findATA(mint, payer.publicKey, TOKEN_PROGRAM_ID),
      tokenAddresses.redeemer.account,
      payer.publicKey,
      MAX_U64,
      undefined,
      TOKEN_PROGRAM_ID,
    ),
  );

  const txRes = await sendAndConfirmTransaction(
    provider.connection,
    tx,
    [payer],
    {
      commitment: 'finalized',
    },
  );

  console.log({ txRes });
};
