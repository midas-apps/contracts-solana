import { AnchorProvider } from '@coral-xyz/anchor';
import {
  ExtensionType,
  getExtensionData,
  getExtensionTypes,
  getMetadataPointerState,
  getMint,
  getNewAccountLenForExtensionLen,
  getPermanentDelegate,
  getTokenMetadata,
  TOKEN_2022_PROGRAM_ID,
  updateTokenMetadata,
} from '@solana/spl-token';
import { pack } from '@solana/spl-token-metadata';
import type { TokenMetadata } from '@solana/spl-token-metadata';
import { PublicKey } from '@solana/web3.js';

import { createUserError } from '@/common/errorHandler';
import { MProduct } from '@/common/tokenTypes';

import { loadTokenConfig } from '../configs/loadTokenConfig';

import { getTokenAddresses } from './addressQueries';
import { parsePublicKey } from './argumentParser';

export type MetadataField = 'name' | 'symbol' | 'uri';

export interface MetadataUpdate {
  field: MetadataField;
  value: string;
}

export interface MTokenMetadataState {
  mintAddress: PublicKey;
  metadataPointerAuthority: PublicKey | null;
  metadataAddress: PublicKey | null;
  metadata: TokenMetadata;
  extensions: string[];
  permanentDelegate: PublicKey | null;
  accountSize: number;
  lamports: number;
}

export function resolveMintAddress(
  network: string,
  mtoken?: MProduct,
  mintArg?: string,
): PublicKey {
  if (mintArg) {
    return parsePublicKey(mintArg, 'mint address');
  }

  if (!mtoken) {
    throw createUserError('Either --mtoken or --mint is required');
  }

  const tokenAddrs = getTokenAddresses(network, mtoken);
  if (!tokenAddrs?.mToken) {
    throw createUserError(`mToken mint not found for ${mtoken} on ${network}`, [
      `Run: yarn deploy:token-mint --mtoken ${mtoken} --network ${network}`,
      'Or pass --mint <address> explicitly.',
    ]);
  }

  return tokenAddrs.mToken;
}

export function getConfigMetadataUpdates(mtoken: MProduct, network: string): MetadataUpdate[] {
  const config = loadTokenConfig(mtoken, network);
  return [
    { field: 'name', value: config.metadata.name },
    { field: 'symbol', value: config.metadata.symbol },
    { field: 'uri', value: config.metadata.uri || '' },
  ];
}

export async function fetchMTokenMetadataState(
  provider: AnchorProvider,
  mintAddress: PublicKey,
): Promise<MTokenMetadataState> {
  const accountInfo = await provider.connection.getAccountInfo(mintAddress);
  if (!accountInfo) {
    throw createUserError(`Mint account does not exist: ${mintAddress.toBase58()}`);
  }

  const mint = await getMint(provider.connection, mintAddress, undefined, TOKEN_2022_PROGRAM_ID);
  const metadataPointer = getMetadataPointerState(mint);
  const metadata = await getTokenMetadata(
    provider.connection,
    mintAddress,
    undefined,
    TOKEN_2022_PROGRAM_ID,
  );

  if (!metadata) {
    throw createUserError(
      `TokenMetadata extension is not initialized on ${mintAddress.toBase58()}`,
    );
  }

  const permanentDelegate = getPermanentDelegate(mint);

  return {
    mintAddress,
    metadataPointerAuthority: metadataPointer?.authority ?? null,
    metadataAddress: metadataPointer?.metadataAddress ?? null,
    metadata,
    extensions: getExtensionTypes(mint.tlvData).map((extension) => ExtensionType[extension]),
    permanentDelegate: permanentDelegate?.delegate ?? null,
    accountSize: accountInfo.data.length,
    lamports: accountInfo.lamports,
  };
}

export function applyMetadataUpdates(
  metadata: TokenMetadata,
  updates: MetadataUpdate[],
): TokenMetadata {
  return updates.reduce(
    (current, update) => updateTokenMetadata(current, update.field, update.value),
    metadata,
  );
}

export async function getAdditionalRentForMetadataUpdates(
  provider: AnchorProvider,
  mintAddress: PublicKey,
  metadata: TokenMetadata,
  updates: MetadataUpdate[],
): Promise<number> {
  const accountInfo = await provider.connection.getAccountInfo(mintAddress);
  if (!accountInfo) {
    throw createUserError(`Mint account does not exist: ${mintAddress.toBase58()}`);
  }

  const mint = await getMint(provider.connection, mintAddress, undefined, TOKEN_2022_PROGRAM_ID);
  const extensionData = getExtensionData(ExtensionType.TokenMetadata, mint.tlvData);
  if (extensionData === null) {
    throw createUserError(
      `TokenMetadata extension is not initialized on ${mintAddress.toBase58()}`,
    );
  }

  const updatedMetadata = applyMetadataUpdates(metadata, updates);
  const updatedMetadataLen = pack(updatedMetadata).length;
  const newAccountLen = getNewAccountLenForExtensionLen(
    accountInfo,
    mintAddress,
    ExtensionType.TokenMetadata,
    updatedMetadataLen,
    TOKEN_2022_PROGRAM_ID,
  );

  if (newAccountLen <= accountInfo.data.length) {
    return 0;
  }

  const newRentExemptMinimum =
    await provider.connection.getMinimumBalanceForRentExemption(newAccountLen);
  return Math.max(newRentExemptMinimum - accountInfo.lamports, 0);
}

export function formatMetadataAuthority(authority: PublicKey | undefined | null): string {
  return authority ? authority.toBase58() : 'None';
}
