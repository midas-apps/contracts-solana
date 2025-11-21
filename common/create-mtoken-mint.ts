import { AnchorProvider } from '@coral-xyz/anchor';
import {
  ExtensionType,
  createInitializeMintInstruction,
  getMintLen,
  TOKEN_2022_PROGRAM_ID,
  TYPE_SIZE,
  LENGTH_SIZE,
  createInitializeMetadataPointerInstruction,
  createInitializePermanentDelegateInstruction,
} from '@solana/spl-token';
import { createInitializeInstruction, pack, TokenMetadata } from '@solana/spl-token-metadata';
import { Keypair, SystemProgram, Transaction, PublicKey } from '@solana/web3.js';

// Define the extensions to be used by the mint
const extensions = [ExtensionType.PermanentDelegate, ExtensionType.MetadataPointer];

export const createMTBillTokenMint = async ({
  provider,
  mint,
  authority,
}: {
  provider: AnchorProvider;
  mint?: Keypair;
  authority: PublicKey;
}) => {
  mint ??= Keypair.generate();

  const metadata = {
    name: 'Midas US Treasury Bill Token',
    symbol: 'mTBILL',
    additionalMetadata: [],
    uri: 'https://raw.githubusercontent.com/midas-apps/midas-assets/refs/heads/main/solana/mtbill-metadata',
    mint: mint.publicKey,
    updateAuthority: authority,
  } as TokenMetadata;

  const mintLen = getMintLen(extensions);
  const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;

  const mintLamports = await provider.connection.getMinimumBalanceForRentExemption(
    mintLen + metadataLen,
  );

  const mintTransaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: provider.wallet.publicKey,
      newAccountPubkey: mint.publicKey,
      space: mintLen,
      lamports: mintLamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeMetadataPointerInstruction(
      mint.publicKey,
      authority,
      mint.publicKey,
      TOKEN_2022_PROGRAM_ID,
    ),
    createInitializePermanentDelegateInstruction(mint.publicKey, authority, TOKEN_2022_PROGRAM_ID),
    createInitializeMintInstruction(mint.publicKey, 9, authority, authority, TOKEN_2022_PROGRAM_ID),
    createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      mint: mint.publicKey,
      metadata: metadata.mint,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      mintAuthority: authority,
      updateAuthority: authority,
    }),
  );

  await provider.sendAndConfirm(mintTransaction, [mint]);

  return mint;
};

export const createMTokenMint = async ({
  provider,
  mint,
  metadata,
  authority,
}: {
  provider: AnchorProvider;
  mint?: Keypair;
  metadata: Omit<TokenMetadata, 'updateAuthority' | 'mint'>;
  authority: PublicKey;
}) => {
  mint ??= Keypair.generate();

  const fullMetadata = {
    ...metadata,
    mint: mint.publicKey,
    updateAuthority: authority,
  };

  const mintLen = getMintLen(extensions);
  const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(fullMetadata).length;

  const mintLamports = await provider.connection.getMinimumBalanceForRentExemption(
    mintLen + metadataLen,
  );

  const mintTransaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: provider.wallet.publicKey,
      newAccountPubkey: mint.publicKey,
      space: mintLen,
      lamports: mintLamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeMetadataPointerInstruction(
      mint.publicKey,
      authority,
      mint.publicKey,
      TOKEN_2022_PROGRAM_ID,
    ),
    createInitializePermanentDelegateInstruction(mint.publicKey, authority, TOKEN_2022_PROGRAM_ID),
    createInitializeMintInstruction(mint.publicKey, 9, authority, authority, TOKEN_2022_PROGRAM_ID),
    createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      mint: mint.publicKey,
      metadata: fullMetadata.mint,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      mintAuthority: authority,
      updateAuthority: authority,
    }),
  );

  await provider.sendAndConfirm(mintTransaction, [mint]);

  return mint;
};
