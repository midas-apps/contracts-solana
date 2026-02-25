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
import {
  Keypair,
  SystemProgram,
  Transaction,
  PublicKey,
  Connection,
  Signer,
} from '@solana/web3.js';

import { sendAndWaitForCustomSolanaTxSign, TxSignMetadata } from './solanaTxHelper';
import { FailedTransactionMetadata, TransactionMetadata } from 'litesvm';

// Define the extensions to be used by the mint
const extensions = [ExtensionType.PermanentDelegate, ExtensionType.MetadataPointer];

type SendTransactionFn = (
  connection: Connection,
  transaction: Transaction,
  signers: Signer[],
) => Promise<TransactionMetadata | FailedTransactionMetadata | string>;

interface CreateMintBaseParams {
  mint?: Keypair;
  authority: PublicKey;
}

interface CreateMintProviderParams extends CreateMintBaseParams {
  provider: AnchorProvider;
  /** Required when using Fordefi signing */
  txMetadata?: TxSignMetadata;
  payer?: never;
  connection?: never;
  sendTxFn?: never;
}

interface CreateMintTestParams extends CreateMintBaseParams {
  provider?: never;
  payer: Signer;
  connection: Connection;
  sendTxFn: SendTransactionFn;
}

export const createMTBillTokenMint = async (
  params: CreateMintProviderParams | CreateMintTestParams,
) => {
  const mint = params.mint ?? Keypair.generate();

  const metadata = {
    name: 'Midas US Treasury Bill Token',
    symbol: 'mTBILL',
    additionalMetadata: [],
    uri: 'https://raw.githubusercontent.com/midas-apps/midas-assets/refs/heads/main/solana/mtbill-metadata',
    mint: mint.publicKey,
    updateAuthority: params.authority,
  } as TokenMetadata;

  const mintLen = getMintLen(extensions);
  const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;

  // Determine connection and payer based on params
  const connection = params.provider ? params.provider.connection : params.connection;
  const payer = params.provider ? params.provider.wallet.publicKey : params.payer.publicKey;

  const mintLamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);

  const mintTransaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint.publicKey,
      space: mintLen,
      lamports: mintLamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeMetadataPointerInstruction(
      mint.publicKey,
      params.authority,
      mint.publicKey,
      TOKEN_2022_PROGRAM_ID,
    ),
    createInitializePermanentDelegateInstruction(
      mint.publicKey,
      params.authority,
      TOKEN_2022_PROGRAM_ID,
    ),
    createInitializeMintInstruction(
      mint.publicKey,
      9,
      params.authority,
      params.authority,
      TOKEN_2022_PROGRAM_ID,
    ),
    createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      mint: mint.publicKey,
      metadata: metadata.mint,
      name: metadata.name,
      symbol: metadata.symbol,
      uri: metadata.uri,
      mintAuthority: params.authority,
      updateAuthority: params.authority,
    }),
  );

  // Send transaction based on environment
  if (params.provider) {
    const providerParams = params as CreateMintProviderParams;
    if (providerParams.txMetadata) {
      // Use custom signer (Fordefi) flow
      await sendAndWaitForCustomSolanaTxSign(params.provider, mintTransaction, [mint], {
        ...providerParams.txMetadata,
        waitForTx: providerParams.txMetadata.waitForTx ?? true,
        pollingIntervalMs: providerParams.txMetadata.pollingIntervalMs ?? 1000,
        timeoutDurationMs: providerParams.txMetadata.timeoutDurationMs ?? 120 * 1000,
      });
    } else {
      // Local wallet flow
      await params.provider.sendAndConfirm(mintTransaction, [mint]);
    }
  } else {
    await params.sendTxFn(connection, mintTransaction, [params.payer, mint]);
  }

  return mint;
};
interface CreateMTokenProviderParams extends CreateMintBaseParams {
  metadata: Omit<TokenMetadata, 'updateAuthority' | 'mint'>;
  provider: AnchorProvider;
  /** Required when using Fordefi signing */
  txMetadata?: TxSignMetadata;
  payer?: never;
  connection?: never;
  sendTxFn?: never;
}

interface CreateMTokenTestParams extends CreateMintBaseParams {
  metadata: Omit<TokenMetadata, 'updateAuthority' | 'mint'>;
  provider?: never;
  payer: Signer;
  connection: Connection;
  sendTxFn: SendTransactionFn;
}

export const createMTokenMint = async (
  params: CreateMTokenProviderParams | CreateMTokenTestParams,
) => {
  const mint = params.mint ?? Keypair.generate();

  const fullMetadata = {
    ...params.metadata,
    mint: mint.publicKey,
    updateAuthority: params.authority,
  };

  const mintLen = getMintLen(extensions);
  const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(fullMetadata).length;

  // Determine connection and payer based on params
  const connection = params.provider ? params.provider.connection : params.connection;
  const payer = params.provider ? params.provider.wallet.publicKey : params.payer.publicKey;

  const mintLamports = await connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);

  const mintTransaction = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint.publicKey,
      space: mintLen,
      lamports: mintLamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    createInitializeMetadataPointerInstruction(
      mint.publicKey,
      params.authority,
      mint.publicKey,
      TOKEN_2022_PROGRAM_ID,
    ),
    createInitializePermanentDelegateInstruction(
      mint.publicKey,
      params.authority,
      TOKEN_2022_PROGRAM_ID,
    ),
    createInitializeMintInstruction(
      mint.publicKey,
      9,
      params.authority,
      params.authority,
      TOKEN_2022_PROGRAM_ID,
    ),
    createInitializeInstruction({
      programId: TOKEN_2022_PROGRAM_ID,
      mint: mint.publicKey,
      metadata: fullMetadata.mint,
      name: params.metadata.name,
      symbol: params.metadata.symbol,
      uri: params.metadata.uri,
      mintAuthority: params.authority,
      updateAuthority: params.authority,
    }),
  );

  // Send transaction based on environment
  if (params.provider) {
    const providerParams = params as CreateMTokenProviderParams;
    if (providerParams.txMetadata) {
      // Use custom signer (Fordefi) flow
      await sendAndWaitForCustomSolanaTxSign(params.provider, mintTransaction, [mint], {
        ...providerParams.txMetadata,
        waitForTx: providerParams.txMetadata.waitForTx ?? true,
        pollingIntervalMs: providerParams.txMetadata.pollingIntervalMs ?? 1000,
        timeoutDurationMs: providerParams.txMetadata.timeoutDurationMs ?? 120 * 1000,
      });
    } else {
      // Local wallet flow
      await params.provider.sendAndConfirm(mintTransaction, [mint]);
    }
  } else {
    await params.sendTxFn(connection, mintTransaction, [params.payer, mint]);
  }

  return mint;
};
