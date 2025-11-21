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
    txSignMetadata: {
      comment?: string;
      action: string;
      chain?: string;
      mToken?: string;
      idempotenceId?: string;
      waitForTx?: boolean;
      timeoutDurationMs?: number;
      pollingIntervalMs?: number;
    },
  ) => Promise<string | { sent: boolean; txId?: string }>;
  getSolanaWalletAddressForAction: (action: string, mtoken?: string, chainId?: string) => string;
}

function createProvider(network: string, wallet: Wallet): AnchorProvider {
  const provider = new AnchorProvider(getNetworkConnection(network), wallet, {
    commitment: 'confirmed',
  });
  setProvider(provider);
  return provider;
}

async function createFordefiProvider(
  network: string,
  customSignerModule: CustomSignerModule,
  action: string,
  mtoken?: string,
): Promise<{ provider: AnchorProvider; payer: Wallet }> {
  const chainId = getFordefiChainId(network);
  const walletAddress = customSignerModule.getSolanaWalletAddressForAction(action, mtoken, chainId);

  // Create a simple wallet that just holds the public key
  // Actual signing is handled by sendAndWaitForCustomSolanaTxSign
  const payer: Wallet = {
    publicKey: new PublicKey(walletAddress),
    signTransaction: async () => {
      throw new Error(
        'Direct wallet signing not supported with Fordefi. Use sendAndWaitForCustomSolanaTxSign instead.',
      );
    },
    signAllTransactions: async () => {
      throw new Error(
        'Direct wallet signing not supported with Fordefi. Use sendAndWaitForCustomSolanaTxSign instead.',
      );
    },
  };

  const provider = createProvider(network, payer);
  return { provider, payer };
}

function createKeypairProvider(network: string): { provider: AnchorProvider; payer: Wallet } {
  const walletPath = process.env.WALLET_PATH;
  if (!walletPath) {
    throw createUserError('WALLET_PATH environment variable is not set', [
      'Please set the WALLET_PATH environment variable to the path of your wallet keypair file',
    ]);
  }

  const payer = loadWallet(walletPath);
  const wallet = new AnchorWallet(payer);
  const provider = createProvider(network, wallet);
  return { provider, payer: wallet };
}

/** Create network provider for Solana/Anchor operations */
export async function createNetworkProvider(
  network: string,
  customSignerModule?: CustomSignerModule,
  action?: string,
  mtoken?: string,
): Promise<{
  provider: AnchorProvider;
  payer: Wallet;
}> {
  return customSignerModule
    ? createFordefiProvider(network, customSignerModule, action, mtoken)
    : createKeypairProvider(network);
}
