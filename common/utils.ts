import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

import { AnchorProvider, Wallet, setProvider } from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';

import { getNetworkConnection } from '@/scripts/utils/networkResolver';

export function createNetworkProvider(
  network: string,
  walletPath?: string,
): { provider: AnchorProvider; payer: Keypair } {
  const p = walletPath || '~/.config/solana/midas_id.json';
  const path = p.startsWith('~') ? join(homedir(), p.slice(1)) : p;
  if (!existsSync(path)) throw new Error(`Wallet file not found: ${path}`);
  const payer = Keypair.fromSecretKey(Buffer.from(JSON.parse(readFileSync(path, 'utf-8'))));
  const provider = new AnchorProvider(getNetworkConnection(network), new Wallet(payer), {
    commitment: 'confirmed',
  });
  setProvider(provider);
  return { provider, payer };
}

export async function executeNetworkScript(
  network: string,
  scriptFn: (provider: AnchorProvider, wallet: Keypair) => Promise<unknown>,
  walletPath?: string,
): Promise<void> {
  try {
    const { provider, payer } = createNetworkProvider(network, walletPath);
    await scriptFn(provider, payer);
  } catch (error) {
    console.error('ERROR! 🔴', error);
    throw error;
  }
}
