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
import {
  sendAndConfirmTransaction,
  Connection,
  Keypair,
  SystemProgram,
  Transaction,
  PublicKey,
  Signer,
} from '@solana/web3.js';

// Define the extensions to be used by the mint
const extensions = [ExtensionType.PermanentDelegate, ExtensionType.MetadataPointer];

export const createMTBillTokenMint = async ({
  payer,
  mint,
  authority,
  connection,
  sendTxFn,
}: {
  connection: Connection;
  payer: Keypair;
  mint?: Keypair;
  authority: PublicKey;
  sendTxFn?: (
    connection: Connection,
    transaction: Transaction,
    signers: Signer[],
  ) => Promise<unknown>;
}) => {
  mint ??= Keypair.generate();
  sendTxFn ??= sendAndConfirmTransaction;

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

  const mintLamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);

  const mintTransaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
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

  await sendTxFn(connection, mintTransaction, [payer, mint]);

  return mint;
};

export const createMTokenMint = async ({
  payer,
  mint,
  metadata,
  authority,
  connection,
  sendTxFn,
}: {
  connection: Connection;
  payer: Keypair;
  mint?: Keypair;
  metadata: Omit<TokenMetadata, 'updateAuthority' | 'mint'>;
  authority: PublicKey;
  sendTxFn?: (
    connection: Connection,
    transaction: Transaction,
    signers: Signer[],
  ) => Promise<unknown>;
}) => {
  mint ??= Keypair.generate();
  sendTxFn ??= sendAndConfirmTransaction;

  const fullMetadata = {
    ...metadata,
    mint: mint.publicKey,
    updateAuthority: authority,
  };

  const mintLen = getMintLen(extensions);
  const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(fullMetadata).length;

  const mintLamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);

  const mintTransaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
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

  await sendTxFn(connection, mintTransaction, [payer, mint]);

  return mint;
};
