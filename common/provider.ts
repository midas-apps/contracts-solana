import { AnchorProvider, Wallet as AnchorWallet, setProvider } from '@coral-xyz/anchor';
import type { Wallet } from '@coral-xyz/anchor/dist/cjs/provider';
import { PublicKey } from '@solana/web3.js';

import { getNetworkConnection } from '@/scripts/utils/networkResolver';

import { createUserError } from './errorHandler';
import { getFordefiChainId } from './fordefiNetworkMapper';
import { loadWallet } from './wallet';

export interface CustomSignerModule {
  signSolanaTransaction: (
    serializedTransaction: string,
    metadata: {
      action: string;
      comment?: string;
      chain?: string;
      mToken?: string;
      idempotenceId?: string;
      waitForTx?: boolean;
      timeoutDurationMs?: number;
      pollingIntervalMs?: number;
      pushMode?: 'auto' | 'manual';
    },
  ) => Promise<string | { sent: boolean; txId?: string; signedTransaction?: string }>;
  getSolanaWalletAddressForAction: (action: string, mtoken?: string, chainId?: string) => string;
}

function createProvider(network: string, wallet: Wallet): AnchorProvider {
  const isLocalnet = network.toLowerCase() === 'localnet';
  const provider = new AnchorProvider(getNetworkConnection(network), wallet, {
    commitment: isLocalnet ? 'processed' : 'confirmed',
    skipPreflight: isLocalnet,
  });
  setProvider(provider);
  return provider;
}

function createFordefiProvider(
  network: string,
  signer: CustomSignerModule,
  action: string,
  mtoken?: string,
): { provider: AnchorProvider; payer: Wallet } {
  const chainId = getFordefiChainId(network);
  const walletAddress = signer.getSolanaWalletAddressForAction(action, mtoken, chainId);

  // Fordefi wallet: public key only, signing handled by solanaTxHelper
  const payer: Wallet = {
    publicKey: new PublicKey(walletAddress),
    signTransaction: async () => {
      throw new Error('Use sendAndWaitForCustomSolanaTxSign for Fordefi signing');
    },
    signAllTransactions: async () => {
      throw new Error('Use sendAndWaitForCustomSolanaTxSign for Fordefi signing');
    },
  };

  return { provider: createProvider(network, payer), payer };
}

function createKeypairProvider(network: string): { provider: AnchorProvider; payer: Wallet } {
  const walletPath = process.env.WALLET_PATH;
  if (!walletPath) {
    throw createUserError('WALLET_PATH environment variable is not set');
  }

  const keypair = loadWallet(walletPath);
  const wallet = new AnchorWallet(keypair);
  return { provider: createProvider(network, wallet), payer: wallet };
}

export async function createNetworkProvider(
  network: string,
  customSignerModule?: CustomSignerModule,
  action?: string,
  mtoken?: string,
): Promise<{ provider: AnchorProvider; payer: Wallet }> {
  return customSignerModule && action
    ? createFordefiProvider(network, customSignerModule, action, mtoken)
    : createKeypairProvider(network);
}
