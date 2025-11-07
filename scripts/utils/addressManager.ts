import { PublicKey } from '@solana/web3.js';

import { addresses, TokenAddresses, DataFeed } from '@/common/addresses';
import { MProduct, PaymentToken } from '@/common/tokenTypes';

import { DeploymentState, markComponentCompleted, ComponentName } from './deploymentState';

/**
 * Initialize a network entry in addresses if it doesn't exist
 * Throws an error if network doesn't exist and devnet fallback is not available
 */
function ensureNetworkExists(network: string): void {
  if (!addresses[network]) {
    // For localnet, we can initialize with empty structure
    // For other networks, require explicit setup
    if (network === 'localnet') {
      addresses[network] = {
        tokens: {} as Partial<Record<MProduct, TokenAddresses>>,
      };
    } else if (addresses.devnet) {
      // Use devnet as fallback for other networks (backward compatibility)
      addresses[network] = {
        acRoleGlobal: addresses.devnet.acRoleGlobal,
        ac: addresses.devnet.ac,
        tokens: {} as Partial<Record<MProduct, TokenAddresses>>,
      };
    } else {
      throw new Error(
        `Network '${network}' not found in addresses. Please initialize it in common/addresses.ts or ensure devnet exists as fallback.`,
      );
    }
  }
}

/**
 * Register global AC and AC Role Global addresses for a network
 * This is separate from token-specific addresses
 */
export function registerGlobalAddresses(
  network: string,
  acRoleGlobal: PublicKey,
  ac: PublicKey,
): void {
  ensureNetworkExists(network);

  const networkAddrs = addresses[network]!;

  networkAddrs.acRoleGlobal = acRoleGlobal;
  networkAddrs.ac = ac;
}

/**
 * Check if global addresses need to be deployed (are missing/undefined)
 */
export function needsGlobalAddressesDeployment(network: string): boolean {
  const networkAddrs = addresses[network];
  if (!networkAddrs) {
    return true;
  }

  return !networkAddrs.acRoleGlobal || !networkAddrs.ac;
}

/**
 * Validate that the value type matches the expected component type
 */
function validateComponentValue<K extends keyof TokenAddresses>(
  component: K,
  value: TokenAddresses[K],
): void {
  // TypeScript ensures type safety at compile time, but we add runtime checks for safety
  if (value === null || value === undefined) {
    throw new Error(
      `Invalid value for component '${component}': value cannot be null or undefined`,
    );
  }

  // Validate PublicKey types
  if (component === 'acRole' || component === 'mTokenDataFeed' || component === 'mToken') {
    if (!(value instanceof PublicKey)) {
      throw new Error(
        `Invalid value for component '${component}': expected PublicKey, got ${typeof value}`,
      );
    }
  }

  // Validate object types
  if (component === 'tokenAuthority') {
    if (
      typeof value !== 'object' ||
      !('account' in value) ||
      !('seed' in value) ||
      !(value.account instanceof PublicKey) ||
      typeof value.seed !== 'string'
    ) {
      throw new Error(
        `Invalid value for component '${component}': expected { account: PublicKey, seed: string }`,
      );
    }
  }

  if (component === 'minter' || component === 'redeemer') {
    if (
      typeof value !== 'object' ||
      !('commonVault' in value) ||
      !('account' in value) ||
      !(value.commonVault instanceof PublicKey) ||
      !(value.account instanceof PublicKey)
    ) {
      throw new Error(
        `Invalid value for component '${component}': expected { commonVault: PublicKey, account: PublicKey }`,
      );
    }
  }
}

/**
 * Register a deployed address for a token component
 */
export function registerAddress<K extends keyof TokenAddresses>(
  network: string,
  tokenSymbol: MProduct,
  component: K,
  value: TokenAddresses[K],
): void {
  // Validate the value matches the component type
  validateComponentValue(component, value);

  // Ensure network exists
  ensureNetworkExists(network);

  const networkAddrs = addresses[network]!;

  // Ensure tokens structure exists
  if (!networkAddrs.tokens) {
    networkAddrs.tokens = {} as Partial<Record<MProduct, TokenAddresses>>;
  }

  // Ensure token entry exists
  if (!networkAddrs.tokens[tokenSymbol]) {
    networkAddrs.tokens[tokenSymbol] = {} as TokenAddresses;
  }

  // Type-safe assignment - TypeScript ensures this is correct
  networkAddrs.tokens[tokenSymbol]![component] = value;
}

/**
 * Get token addresses for a network and token symbol
 */
export function getTokenAddresses(
  network: string,
  tokenSymbol: MProduct,
): TokenAddresses | undefined {
  const networkAddrs = addresses[network];
  if (!networkAddrs) return undefined;

  if (networkAddrs.tokens?.[tokenSymbol]) {
    return networkAddrs.tokens[tokenSymbol];
  }

  return undefined;
}

/**
 * Get feed addresses for a network and feed symbol
 */
export function getFeedAddresses(network: string, feedSymbol: PaymentToken): DataFeed | undefined {
  const networkAddrs = addresses[network];
  if (!networkAddrs?.feeds) return undefined;
  return networkAddrs.feeds[feedSymbol];
}

/**
 * Map TokenAddresses component keys to deployment state component names
 */
function mapComponentToStateName<K extends keyof TokenAddresses>(component: K): ComponentName {
  const mapping: Partial<Record<keyof TokenAddresses, ComponentName>> = {
    acRole: 'acRole',
    mToken: 'mToken',
    mTokenDataFeed: 'dataFeed',
    tokenAuthority: 'tokenAuthority',
    minter: 'minterVault',
    redeemer: 'redeemerVault',
  };

  const stateName = mapping[component];
  if (!stateName) {
    throw new Error(`No mapping found for component: ${String(component)}`);
  }
  return stateName;
}

/**
 * Extract PublicKey from a TokenAddresses value for state tracking
 */
function extractPublicKey<K extends keyof TokenAddresses>(
  component: K,
  value: TokenAddresses[K],
): PublicKey {
  if (value instanceof PublicKey) {
    return value;
  }

  if (typeof value === 'object' && value !== null) {
    if ('account' in value && value.account instanceof PublicKey) {
      return value.account;
    }
    if ('commonVault' in value && value.commonVault instanceof PublicKey) {
      return value.commonVault;
    }
  }

  throw new Error(`Cannot extract PublicKey from component '${String(component)}' value`);
}

/**
 * Unified helper that registers an address and marks the component as completed
 * This ensures consistency between address registration and deployment state
 */
export function registerAndComplete<K extends keyof TokenAddresses>(
  network: string,
  tokenSymbol: MProduct,
  component: K,
  value: TokenAddresses[K],
  state: DeploymentState,
  transactionSignature?: string,
): void {
  // Register the address
  registerAddress(network, tokenSymbol, component, value);

  // Map component name to deployment state component name
  const stateComponentName = mapComponentToStateName(component);

  // Extract PublicKey for state tracking
  const address = extractPublicKey(component, value);

  // Mark as completed in deployment state
  markComponentCompleted(state, stateComponentName, address, transactionSignature);
}
