import * as fs from 'fs';
import * as path from 'path';

import { AnchorProvider } from '@coral-xyz/anchor';
import * as anchor from '@coral-xyz/anchor';
import { Keypair, Commitment } from '@solana/web3.js';

import { getNetworkConnection } from '@/scripts/utils/networkResolver';

export function createNetworkProvider(
  network: string,
  walletPath?: string,
): { provider: AnchorProvider; payer: Keypair } {
  const connection = getNetworkConnection(network);
  const commitment: Commitment = 'confirmed';

  // Load wallet
  const walletFile = walletPath || '~/.config/solana/midas_id.json';
  const expandedPath = walletFile.startsWith('~')
    ? path.join(process.env.HOME || '', walletFile.slice(1))
    : walletFile;

  if (!fs.existsSync(expandedPath)) {
    throw new Error(`Wallet file not found: ${expandedPath}. Please ensure the wallet exists.`);
  }

  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(expandedPath, 'utf-8'))),
  );

  // Create wallet adapter compatible with AnchorProvider
  const wallet = {
    publicKey: walletKeypair.publicKey,
    signTransaction: async (tx) => {
      tx.sign(walletKeypair);
      return tx;
    },
    signAllTransactions: async (txs) => {
      return txs.map((tx) => {
        tx.sign(walletKeypair);
        return tx;
      });
    },
  };

  const provider = new AnchorProvider(connection, wallet, {
    commitment,
    skipPreflight: false,
  });

  anchor.setProvider(provider);

  return { provider, payer: walletKeypair };
}

/**
 * Execute a script with Anchor provider from environment (Anchor.toml)
 * @deprecated Use executeNetworkScript instead for network-specific deployments
 */
export const executeAnchorScript = async (
  scriptFn: (provider: AnchorProvider, wallet: Keypair) => Promise<unknown>,
) => {
  const provider = AnchorProvider.env();
  anchor.setProvider(provider);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payer = new Keypair((provider.wallet as any).payer._keypair);

  try {
    await scriptFn(provider, payer);
  } catch (e) {
    console.error('ERROR! 🔴');
    console.error(e);
  }
};

/**
 * Execute a script with a provider for a specific network
 */
export const executeNetworkScript = async (
  network: string,
  scriptFn: (provider: AnchorProvider, wallet: Keypair) => Promise<unknown>,
  walletPath?: string,
) => {
  try {
    const { provider, payer } = createNetworkProvider(network, walletPath);
    await scriptFn(provider, payer);
  } catch (e) {
    console.error('ERROR! 🔴');
    console.error(e);
    throw e;
  }
};
