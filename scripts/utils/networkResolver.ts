import { Cluster, Connection, PublicKey } from '@solana/web3.js';

import { addresses, getTokenAddresses } from '@/common/addresses';
import { MProduct } from '@/common/tokenTypes';

/**
 * Map network names to Solana cluster URLs
 */
const CLUSTER_URLS: Record<string, string> = {
  devnet: 'https://api.devnet.solana.com',
  testnet: 'https://api.testnet.solana.com',
  mainnet: 'https://api.mainnet-beta.solana.com',
  localnet: 'http://127.0.0.1:8899',
};

/**
 * Get Solana cluster URL for a network
 */
export function getClusterUrl(network: string): string {
  const url = CLUSTER_URLS[network.toLowerCase()];
  if (!url) {
    throw new Error(
      `Unknown network: ${network}. Available networks: ${Object.keys(CLUSTER_URLS).join(', ')}`,
    );
  }
  return url;
}

/**
 * Get Solana cluster type for a network
 */
export function getCluster(network: string): Cluster {
  const normalized = network.toLowerCase();
  if (normalized === 'mainnet' || normalized === 'mainnet-beta') {
    return 'mainnet-beta';
  }
  if (normalized === 'devnet') {
    return 'devnet';
  }
  if (normalized === 'testnet') {
    return 'testnet';
  }
  if (normalized === 'localnet' || normalized === 'localhost') {
    return 'devnet'; // Anchor uses devnet for localnet
  }
  throw new Error(`Unknown network: ${network}`);
}

/**
 * Create a Connection for a network
 */
export function getNetworkConnection(network: string): Connection {
  const url = getClusterUrl(network);
  return new Connection(url, 'confirmed');
}

/**
 * Get network-specific addresses
 */
export function getNetworkAddresses(network: string) {
  const networkAddrs = addresses[network];
  if (!networkAddrs) {
    throw new Error(`Network addresses not found for: ${network}`);
  }
  return networkAddrs;
}

/**
 * Get AC address for a network (from addresses.ts only)
 * Addresses live only in common/addresses.ts
 */
export function getAcAddress(network: string): PublicKey | undefined {
  const networkAddrs = getNetworkAddresses(network);
  return networkAddrs.ac;
}

/**
 * Get AC Role Global address for a network (from addresses.ts only)
 * Addresses live only in common/addresses.ts
 */
export function getAcRoleGlobalAddress(network: string): PublicKey | undefined {
  const networkAddrs = getNetworkAddresses(network);
  return networkAddrs.acRoleGlobal;
}

/**
 * Get token AC Role address for a network and token
 */
export function getTokenAcRoleAddress(
  network: string,
  tokenSymbol: MProduct,
): PublicKey | undefined {
  const tokenAddrs = getTokenAddresses(network, tokenSymbol);
  return tokenAddrs?.acRole;
}

/**
 * Validate network name
 */
export function validateNetwork(network: string): void {
  if (!CLUSTER_URLS[network.toLowerCase()]) {
    throw new Error(
      `Invalid network: ${network}. Available: ${Object.keys(CLUSTER_URLS).join(', ')}`,
    );
  }
}
