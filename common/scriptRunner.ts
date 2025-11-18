import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';
import { config } from 'dotenv';

import { handleError } from './errorHandler';
import { createNetworkProvider } from './provider';

config();

/** Execute a network script with error handling and provider setup */
export async function executeNetworkScript(
  network: string,
  scriptFn: (provider: AnchorProvider, wallet: Keypair) => Promise<unknown>,
): Promise<void> {
  try {
    const walletPath = process.env.WALLET_PATH;
    const { provider, payer } = createNetworkProvider(network, walletPath);
    await scriptFn(provider, payer);
  } catch (error) {
    handleError(error);
  }
}
