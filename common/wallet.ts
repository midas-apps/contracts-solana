import { readFileSync, existsSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

import { Keypair } from '@solana/web3.js';

import { createUserError } from './errorHandler';

const DEFAULT_WALLET_PATH = '~/.config/solana/midas_id.json';

/** Resolve wallet path, expanding ~ to home directory */
function resolveWalletPath(walletPath: string = DEFAULT_WALLET_PATH): string {
  return walletPath.startsWith('~') ? join(homedir(), walletPath.slice(1)) : walletPath;
}

/** Load wallet keypair from file */
export function loadWallet(walletPath?: string): Keypair {
  const path = resolveWalletPath(walletPath);
  if (!existsSync(path)) {
    throw createUserError(`Wallet file not found: ${path}`, [
      `Place your wallet keypair file at: ${DEFAULT_WALLET_PATH}`,
      'The file should contain a JSON array with the secret key bytes',
      `Or set WALLET_PATH environment variable to use a different location`,
    ]);
  }
  const secretKey = JSON.parse(readFileSync(path, 'utf-8'));
  return Keypair.fromSecretKey(Buffer.from(secretKey));
}
