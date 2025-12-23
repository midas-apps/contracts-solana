import { Connection } from '@solana/web3.js';

import { createUserError } from '@/common/errorHandler';

const CLUSTER_URLS: Record<string, string> = {
  mainnet: 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
  localnet: 'http://127.0.0.1:8899',
};

export function getNetworkConnection(network: string): Connection {
  const normalized = network.toLowerCase();
  const url = CLUSTER_URLS[normalized];

  if (!url) {
    throw createUserError(`Invalid network: ${network}`, [
      `Available: ${Object.keys(CLUSTER_URLS).join(', ')}`,
    ]);
  }

  const commitment = normalized === 'localnet' ? 'processed' : 'confirmed';
  return new Connection(url, commitment);
}
