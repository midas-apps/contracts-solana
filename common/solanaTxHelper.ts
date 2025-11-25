import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair, Transaction, VersionedTransaction } from '@solana/web3.js';

import { getFordefiChainId } from './fordefiNetworkMapper';
import type { CustomSignerModule } from './provider';

export interface TxSignMetadata {
  action: string;
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
    const chainId = getFordefiChainId(storedNetwork);

    if (transaction instanceof Transaction) {
      const { blockhash } = await provider.connection.getLatestBlockhash(commitment);
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = provider.publicKey;
    }

    if (signers.length > 0) {
      if (transaction instanceof Transaction) {
        transaction.partialSign(...signers);
      } else {
        transaction.sign(signers);
      }
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
    });

    if (typeof result === 'string') {
      return { sent: true, signature: result };
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
