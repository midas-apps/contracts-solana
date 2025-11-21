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

export function initCustomSigner(signer: CustomSignerModule | undefined) {
  customSigner = signer;
}

export async function sendAndWaitForCustomSolanaTxSign(
  provider: AnchorProvider,
  network: string,
  transaction: Transaction | VersionedTransaction,
  signers: Keypair[],
  txSignMetadata: TxSignMetadata,
): Promise<TxResult> {
  if (customSigner) {
    const chainId = getFordefiChainId(network);

    if (transaction instanceof Transaction && !transaction.recentBlockhash) {
      const { blockhash } = await provider.connection.getLatestBlockhash();
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
      action: txSignMetadata.action,
      comment: txSignMetadata.comment,
      chain: chainId,
      mToken: txSignMetadata.mToken,
      idempotenceId: txSignMetadata.idempotenceId,
      waitForTx: txSignMetadata.waitForTx,
      timeoutDurationMs: txSignMetadata.timeoutDurationMs,
      pollingIntervalMs: txSignMetadata.pollingIntervalMs,
    });

    // Handle both string and object return types
    if (typeof result === 'string') {
      console.log(`✅ Transaction signature: ${result}`);
      return {
        sent: true,
        signature: result,
      };
    }

    if (result.sent && result.txId) {
      console.log(`✅ Transaction submitted to Fordefi: ${result.txId}`);
    } else {
      console.log('ℹ️  Transaction was not submitted (possibly duplicate)');
    }

    return result;
  }

  // Local wallet flow: sign and send directly
  const signature = await provider.sendAndConfirm(transaction, signers, {
    commitment: 'finalized',
  });

  console.log(`✅ Transaction confirmed: ${signature}`);

  return {
    sent: true,
    signature,
  };
}
