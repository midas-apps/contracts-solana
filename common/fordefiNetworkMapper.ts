import { createUserError } from './errorHandler';

export enum FordefiUniqueChainId {
  SOLANA_MAINNET = 'solana_mainnet',
  SOLANA_DEVNET = 'solana_devnet',
}

const NETWORK_TO_FORDEFI_CHAIN: Record<string, FordefiUniqueChainId> = {
  mainnet: FordefiUniqueChainId.SOLANA_MAINNET,
  devnet: FordefiUniqueChainId.SOLANA_DEVNET,
};

export function getFordefiChainId(network: string): FordefiUniqueChainId {
  const normalized = network.toLowerCase();
  const chainId = NETWORK_TO_FORDEFI_CHAIN[normalized];

  if (!chainId) {
    throw createUserError(
      `Network '${network}' is not supported by Fordefi. Use local wallet instead.`,
      [
        `Supported Fordefi networks: ${Object.keys(NETWORK_TO_FORDEFI_CHAIN).join(', ')}`,
        `For '${network}', use action='local-wallet' to use a local keypair`,
      ],
    );
  }

  return chainId;
}

export function isFordefiSupportedNetwork(network: string): boolean {
  const normalized = network.toLowerCase();
  return normalized in NETWORK_TO_FORDEFI_CHAIN;
}
