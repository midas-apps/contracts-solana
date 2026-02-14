import { PublicKey } from '@solana/web3.js';

import { addresses, TokenAddresses, DataFeed } from '@/common/addresses';
import { createUserError } from '@/common/errorHandler';
import { MProduct, PaymentToken } from '@/common/tokenTypes';

import { DeploymentState, markComponentCompleted, ComponentName } from './deploymentState';

// Initialize network in addresses if it doesn't exist
function ensureNetworkExists(network: string): void {
  if (!addresses[network]) {
    if (network === 'localnet') {
      addresses[network] = {
        tokens: {} as Partial<Record<MProduct, TokenAddresses>>,
        feeds: {} as Partial<Record<PaymentToken, DataFeed>>,
      };
    } else {
      throw createUserError(
        `Network '${network}' not found in addresses. Please initialize it in common/addresses.ts`,
        [
          'Supported networks: localnet, devnet, testnet, mainnet',
          'Production networks (devnet, testnet, mainnet) must be explicitly defined',
          'Only localnet can be created dynamically for development',
        ],
      );
    }
  } else {
    // Network exists, ensure all required objects exist
    if (!addresses[network].tokens) {
      addresses[network].tokens = {} as Partial<Record<MProduct, TokenAddresses>>;
    }
    if (!addresses[network].feeds) {
      addresses[network].feeds = {} as Partial<Record<PaymentToken, DataFeed>>;
    }
  }
}

export function registerGlobalAcRole(network: string, acRoleGlobal: PublicKey): void {
  ensureNetworkExists(network);
  const networkAddrs = addresses[network];
  networkAddrs.acRoleGlobal = acRoleGlobal;
}

export function registerGlobalAc(network: string, ac: PublicKey): void {
  ensureNetworkExists(network);
  const networkAddrs = addresses[network];
  if (!networkAddrs.acRoleGlobal) {
    throw new Error(`AC Role must be registered before AC for network ${network}`);
  }
  networkAddrs.ac = ac;
}

export function registerGlobalTimelock(network: string, timelock: PublicKey): void {
  ensureNetworkExists(network);
  const networkAddrs = addresses[network];
  networkAddrs.timelock = timelock;
}

// Validation helpers
function validateValueNotNull<T>(component: string, value: T | null | undefined): void {
  if (value === null || value === undefined) {
    throw createUserError(
      `Invalid value for component '${component}': value cannot be null or undefined`,
      ['Check the component value before registering'],
    );
  }
}

function validatePublicKey(component: string, value: unknown): asserts value is PublicKey {
  if (!(value instanceof PublicKey)) {
    throw createUserError(
      `Invalid value for component '${component}': expected PublicKey, got ${typeof value}`,
      ['Ensure the value is a valid PublicKey'],
    );
  }
}

function validateTokenAuthority(
  component: string,
  value: unknown,
): asserts value is { account: PublicKey; seed: string } {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('account' in value) ||
    !('seed' in value) ||
    !(value.account instanceof PublicKey) ||
    typeof value.seed !== 'string'
  ) {
    throw createUserError(
      `Invalid value for component '${component}': expected { account: PublicKey, seed: string }`,
      ['Ensure the value has the correct structure'],
    );
  }
}

function validateVault(
  component: string,
  value: unknown,
): asserts value is { commonVault: PublicKey; account: PublicKey } {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('commonVault' in value) ||
    !('account' in value) ||
    !(value.commonVault instanceof PublicKey) ||
    !(value.account instanceof PublicKey)
  ) {
    throw createUserError(
      `Invalid value for component '${component}': expected { commonVault: PublicKey, account: PublicKey }`,
      ['Ensure the value has the correct structure'],
    );
  }
}

function validateComponentValue<K extends keyof TokenAddresses>(
  component: K,
  value: TokenAddresses[K],
): void {
  validateValueNotNull(component, value);

  if (
    component === 'acRole' ||
    component === 'mTokenDataFeed' ||
    component === 'mToken' ||
    component === 'mTokenUnderlyingFeed'
  ) {
    validatePublicKey(component, value);
  }

  if (component === 'tokenAuthority') {
    validateTokenAuthority(component, value);
  }

  if (component === 'minter' || component === 'redeemer') {
    validateVault(component, value);
  }
}

// Map component names to deployment state names
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

// Extract PublicKey from component value
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

export function registerAddress<K extends keyof TokenAddresses>(
  network: string,
  tokenSymbol: MProduct,
  component: K,
  value: TokenAddresses[K],
): void {
  validateComponentValue(component, value);
  ensureNetworkExists(network);

  const networkAddrs = addresses[network];
  if (!networkAddrs.tokens[tokenSymbol]) {
    networkAddrs.tokens[tokenSymbol] = {} as TokenAddresses;
  }

  networkAddrs.tokens[tokenSymbol][component] = value;
}

export function registerAndComplete<K extends keyof TokenAddresses>(
  network: string,
  tokenSymbol: MProduct,
  component: K,
  value: TokenAddresses[K],
  state: DeploymentState,
  transactionSignature?: string,
): void {
  registerAddress(network, tokenSymbol, component, value);
  const stateComponentName = mapComponentToStateName(component);
  const address = extractPublicKey(component, value);
  markComponentCompleted(state, stateComponentName, address, transactionSignature);
}

function validateDataFeed(component: string, value: unknown): asserts value is DataFeed {
  if (typeof value !== 'object' || value === null) {
    throw createUserError(`Invalid value for component '${component}': expected DataFeed object`);
  }

  const feed = value as Partial<DataFeed>;
  const fields: (keyof DataFeed)[] = ['token', 'dataFeed', 'tokenProgram', 'underlyingFeed'];
  for (const field of fields) {
    if (feed[field] !== undefined && !(feed[field] instanceof PublicKey)) {
      throw createUserError(
        `Invalid value for component '${component}.${field}': expected PublicKey`,
      );
    }
  }
}

export function registerPaymentTokenFeed(
  network: string,
  paymentToken: PaymentToken,
  feed: DataFeed,
): void {
  validateDataFeed('paymentTokenFeed', feed);
  ensureNetworkExists(network);

  const networkAddrs = addresses[network];
  if (!networkAddrs.feeds) {
    networkAddrs.feeds = {} as Partial<Record<PaymentToken, DataFeed>>;
  }

  networkAddrs.feeds[paymentToken] = feed;
}
