import { AnchorProvider } from '@coral-xyz/anchor';
import {
  Keypair,
  Transaction,
  VersionedTransaction,
  sendAndConfirmRawTransaction,
} from '@solana/web3.js';

import { getFordefiChainId } from './fordefiNetworkMapper';
import type { CustomSignerModule } from './provider';

export interface TxSignMetadata {
  /** Required for Fordefi signing, optional for local wallet */
  action?: string;
  comment?: string;
  mToken?: string;
  idempotenceId?: string;
  waitForTx?: boolean;
  timeoutDurationMs?: number;
  pollingIntervalMs?: number;
}

export interface TxResult {
  sent: boolean;
  txId?: string;
  signature?: string;
}

let customSigner: CustomSignerModule | undefined;
let storedNetwork: string | undefined;

export function initCustomSigner(signer: CustomSignerModule | undefined, network: string) {
  customSigner = signer;
  storedNetwork = network;
}

function deserializeTransaction(base64Data: string): Transaction | VersionedTransaction {
  const buffer = Buffer.from(base64Data, 'base64');
  try {
    return VersionedTransaction.deserialize(buffer);
  } catch {
    return Transaction.from(buffer);
  }
}

function addSignaturesToTransaction(
  signedTx: Transaction | VersionedTransaction,
  signers: Keypair[],
): void {
  if (signers.length === 0) return;

  if (signedTx instanceof Transaction) {
    signedTx.partialSign(...signers);
  } else {
    signedTx.sign(signers);
  }
}

export async function sendAndWaitForCustomSolanaTxSign(
  provider: AnchorProvider,
  transaction: Transaction | VersionedTransaction,
  signers: Keypair[],
  metadata: TxSignMetadata,
): Promise<TxResult> {
  if (!storedNetwork) {
    throw new Error('Call initCustomSigner first');
  }

  const isLocalnet = storedNetwork.toLowerCase() === 'localnet';
  const commitment = isLocalnet ? 'processed' : 'confirmed';

  if (customSigner) {
    if (!metadata.action) {
      throw new Error('action is required for Fordefi signing');
    }

    const chainId = getFordefiChainId(storedNetwork);

    if (transaction instanceof Transaction) {
      const { blockhash } = await provider.connection.getLatestBlockhash(commitment);
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = provider.publicKey;
    }

    const serialized =
      transaction instanceof Transaction
        ? transaction
            .serialize({ requireAllSignatures: false, verifySignatures: false })
            .toString('base64')
        : Buffer.from(transaction.serialize()).toString('base64');

    const result = await customSigner.signSolanaTransaction(serialized, {
      action: metadata.action,
      comment: metadata.comment,
      chain: chainId,
      mToken: metadata.mToken,
      idempotenceId: metadata.idempotenceId,
      waitForTx: metadata.waitForTx,
      timeoutDurationMs: metadata.timeoutDurationMs,
      pollingIntervalMs: metadata.pollingIntervalMs,
      pushMode: signers.length > 0 ? 'manual' : 'auto',
    });

    // Handle string result (legacy flow)
    if (typeof result === 'string') {
      return { sent: true, signature: result };
    }

    // Handle signedTransaction (manual push mode) - add local signatures and broadcast
    if (result.signedTransaction) {
      const signedTx = deserializeTransaction(result.signedTransaction);
      addSignaturesToTransaction(signedTx, signers);

      const signature = await sendAndConfirmRawTransaction(
        provider.connection,
        Buffer.from(signedTx.serialize()),
        { commitment, skipPreflight: isLocalnet },
      );

      return { sent: true, signature, txId: result.txId };
    }

    return result;
  }

  // Local wallet flow
  const signature = await provider.sendAndConfirm(transaction, signers, {
    commitment,
    skipPreflight: isLocalnet,
  });

  return { sent: true, signature };
}
