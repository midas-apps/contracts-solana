import { PublicKey } from '@solana/web3.js';

import { addresses, NetworkAddresses, TokenAddresses, DataFeed } from '@/common/addresses';
import { MProduct, PaymentToken } from '@/common/tokenTypes';

// Address getters (return undefined if not found)
export function getNetworkAddresses(network: string): NetworkAddresses | undefined {
  return addresses[network];
}

export function getTokenAddresses(
  network: string,
  tokenSymbol: MProduct,
): TokenAddresses | undefined {
  const networkAddrs = addresses[network];
  if (!networkAddrs) return undefined;
  return networkAddrs.tokens?.[tokenSymbol];
}

export function getFeedAddresses(network: string, feedSymbol: PaymentToken): DataFeed | undefined {
  return addresses[network]?.feeds?.[feedSymbol];
}

export function getAcAddress(network: string): PublicKey | undefined {
  return addresses[network]?.ac;
}

export function getAcRoleGlobalAddress(network: string): PublicKey | undefined {
  return addresses[network]?.acRoleGlobal;
}

export function getTokenAcRoleAddress(
  network: string,
  tokenSymbol: MProduct,
): PublicKey | undefined {
  return getTokenAddresses(network, tokenSymbol)?.acRole;
}

export function needsGlobalAddressesDeployment(network: string): boolean {
  const networkAddrs = addresses[network];
  if (!networkAddrs) return true;
  return !networkAddrs.acRoleGlobal || !networkAddrs.ac;
}
