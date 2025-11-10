import { AnchorProvider, Wallet, setProvider } from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';

import { getNetworkConnection } from '@/scripts/utils/networkResolver';

import { loadWallet } from './wallet';

/** Create network provider for Solana/Anchor operations */
export function createNetworkProvider(
  network: string,
  walletPath?: string,
): {
  provider: AnchorProvider;
  payer: Keypair;
} {
  const payer = loadWallet(walletPath);
  const provider = new AnchorProvider(getNetworkConnection(network), new Wallet(payer), {
    commitment: 'confirmed',
  });
  setProvider(provider);
  return { provider, payer };
}
