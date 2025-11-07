import * as fs from 'fs';
import * as path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import * as prettier from 'prettier';

import { addresses, TokenAddresses, DataFeed, NetworkAddresses } from '@/common/addresses';
import { MProduct, PaymentToken } from '@/common/tokenTypes';

import { DeploymentState, markComponentCompleted, ComponentName } from './deploymentState';

function ensureNetworkExists(network: string): void {
  if (!addresses[network]) {
    if (network === 'localnet') {
      addresses[network] = {
        tokens: {} as Partial<Record<MProduct, TokenAddresses>>,
      };
    } else if (addresses.devnet) {
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

export function registerGlobalAddresses(
  network: string,
  acRoleGlobal: PublicKey,
  ac: PublicKey,
): void {
  ensureNetworkExists(network);
  const networkAddrs = addresses[network];
  networkAddrs.acRoleGlobal = acRoleGlobal;
  networkAddrs.ac = ac;
}

export function needsGlobalAddressesDeployment(network: string): boolean {
  const networkAddrs = addresses[network];
  if (!networkAddrs) return true;
  return !networkAddrs.acRoleGlobal || !networkAddrs.ac;
}

function validateComponentValue<K extends keyof TokenAddresses>(
  component: K,
  value: TokenAddresses[K],
): void {
  if (value === null || value === undefined) {
    throw new Error(
      `Invalid value for component '${component}': value cannot be null or undefined`,
    );
  }

  if (component === 'acRole' || component === 'mTokenDataFeed' || component === 'mToken') {
    if (!(value instanceof PublicKey)) {
      throw new Error(
        `Invalid value for component '${component}': expected PublicKey, got ${typeof value}`,
      );
    }
  }

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

export function registerAddress<K extends keyof TokenAddresses>(
  network: string,
  tokenSymbol: MProduct,
  component: K,
  value: TokenAddresses[K],
): void {
  validateComponentValue(component, value);
  ensureNetworkExists(network);

  const networkAddrs = addresses[network];
  if (!networkAddrs.tokens) {
    networkAddrs.tokens = {} as Partial<Record<MProduct, TokenAddresses>>;
  }
  if (!networkAddrs.tokens[tokenSymbol]) {
    networkAddrs.tokens[tokenSymbol] = {} as TokenAddresses;
  }

  networkAddrs.tokens[tokenSymbol][component] = value;
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

function formatPublicKey(pubkey: PublicKey): string {
  return `new PublicKey('${pubkey.toString()}')`;
}

function formatTokenAuthority(
  tokenAuthority: { account: PublicKey; seed: string } | undefined,
): string {
  if (!tokenAuthority) return '';
  return `{
        account: ${formatPublicKey(tokenAuthority.account)},
        seed: '${tokenAuthority.seed}',
      }`;
}

function formatVault(vault: { commonVault: PublicKey; account: PublicKey } | undefined): string {
  if (!vault) return '';
  return `{
        commonVault: ${formatPublicKey(vault.commonVault)},
        account: ${formatPublicKey(vault.account)},
      }`;
}

function formatDataFeed(feed: DataFeed | undefined): string {
  if (!feed) return '';
  const parts: string[] = [];
  if (feed.token) parts.push(`token: ${formatPublicKey(feed.token)}`);
  if (feed.tokenProgram) {
    if (feed.tokenProgram.equals(TOKEN_PROGRAM_ID)) {
      parts.push(`tokenProgram: TOKEN_PROGRAM_ID`);
    } else {
      parts.push(`tokenProgram: ${formatPublicKey(feed.tokenProgram)}`);
    }
  }
  if (feed.dataFeed) parts.push(`dataFeed: ${formatPublicKey(feed.dataFeed)}`);
  if (feed.underlyingFeed) parts.push(`underlyingFeed: ${formatPublicKey(feed.underlyingFeed)}`);
  return `{
        ${parts.join(',\n        ')}
      }`;
}

function generateTokenAddressesCode(tokenAddrs: TokenAddresses, indent = '      '): string {
  const parts: string[] = [];
  if (tokenAddrs.acRole) parts.push(`acRole: ${formatPublicKey(tokenAddrs.acRole)}`);
  if (tokenAddrs.mToken) parts.push(`mToken: ${formatPublicKey(tokenAddrs.mToken)}`);
  if (tokenAddrs.tokenAuthority) {
    parts.push(`tokenAuthority: ${formatTokenAuthority(tokenAddrs.tokenAuthority)}`);
  }
  if (tokenAddrs.mTokenDataFeed) {
    parts.push(`mTokenDataFeed: ${formatPublicKey(tokenAddrs.mTokenDataFeed)}`);
  }
  if (tokenAddrs.minter) parts.push(`minter: ${formatVault(tokenAddrs.minter)}`);
  if (tokenAddrs.redeemer) parts.push(`redeemer: ${formatVault(tokenAddrs.redeemer)}`);

  if (parts.length === 0) return '{}';
  return `{
${indent}  ${parts.join(`,\n${indent}  `)}
${indent}}`;
}

function generateNetworkAddressesCode(networkAddrs: NetworkAddresses, indent = '  '): string {
  const parts: string[] = [];

  if (networkAddrs.acRoleGlobal) {
    parts.push(`acRoleGlobal: ${formatPublicKey(networkAddrs.acRoleGlobal)}`);
  }
  if (networkAddrs.ac) {
    parts.push(`ac: ${formatPublicKey(networkAddrs.ac)}`);
  }

  if (networkAddrs.tokens && Object.keys(networkAddrs.tokens).length > 0) {
    const tokenEntries = Object.entries(networkAddrs.tokens)
      .sort(([a], [b]) => {
        const aStr = typeof a === 'string' ? a : String(a);
        const bStr = typeof b === 'string' ? b : String(b);
        return aStr.localeCompare(bStr);
      })
      .map(([tokenSymbol, tokenAddrs]) => {
        const tokenCode = generateTokenAddressesCode(tokenAddrs, indent + '    ');
        const enumKey = String(tokenSymbol);
        const enumKeyName = Object.entries(MProduct).find(([, value]) => value === enumKey)?.[0];
        const finalKey = enumKeyName || enumKey;
        return `${indent}  [MProduct.${finalKey}]: ${tokenCode}`;
      });
    parts.push(`tokens: {\n${tokenEntries.join(',\n')},\n${indent}}`);
  }

  if (networkAddrs.feeds && Object.keys(networkAddrs.feeds).length > 0) {
    const feedEntries = Object.entries(networkAddrs.feeds)
      .sort(([a], [b]) => {
        const aStr = typeof a === 'string' ? a : String(a);
        const bStr = typeof b === 'string' ? b : String(b);
        return aStr.localeCompare(bStr);
      })
      .map(([feedSymbol, feed]) => {
        const feedCode = formatDataFeed(feed);
        const enumKey = String(feedSymbol);
        const enumKeyName = Object.entries(PaymentToken).find(
          ([, value]) => value === enumKey,
        )?.[0];
        const finalKey = enumKeyName || enumKey;
        return `${indent}  [PaymentToken.${finalKey}]: ${feedCode}`;
      });
    parts.push(`feeds: {\n${feedEntries.join(',\n')},\n${indent}}`);
  }

  if (parts.length === 0) return '{}';
  return `{
${indent}  ${parts.join(`,\n${indent}  `)}
${indent}}`;
}

function generateAddressesFileContent(): string {
  const networks = Object.entries(addresses).sort(([a], [b]) => {
    if (a === 'devnet') return -1;
    if (b === 'devnet') return 1;
    if (a === 'localnet') return -1;
    if (b === 'localnet') return 1;
    return a.localeCompare(b);
  });

  const networkEntries = networks.map(([networkName, networkAddrs]) => {
    const networkCode = generateNetworkAddressesCode(networkAddrs);
    if (networkName === 'localnet') {
      return `  // Localnet addresses - populated during deployment
  // Programs are deployed to addresses defined in Anchor.toml [programs.localnet]
  // Note: Addresses may change when local validator is reset
  ${networkName}: ${networkCode}`;
    }
    return `  ${networkName}: ${networkCode}`;
  });

  return `import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

import { MProduct, PaymentToken } from './tokenTypes';

export interface NetworkAddresses {
  acRoleGlobal?: PublicKey;
  ac?: PublicKey;
  tokens?: Partial<Record<MProduct, TokenAddresses>>;
  feeds?: Partial<Record<PaymentToken, DataFeed>>;
}

export interface DataFeed {
  token?: PublicKey;
  tokenProgram?: PublicKey;
  dataFeed?: PublicKey;
  underlyingFeed?: PublicKey;
}

export interface TokenAddresses {
  acRole?: PublicKey;
  mToken?: PublicKey;
  tokenAuthority?: {
    seed: string;
    account: PublicKey;
    };
  mTokenDataFeed?: PublicKey;
  minter?: {
    commonVault: PublicKey;
    account: PublicKey;
  };
  redeemer?: {
    commonVault: PublicKey;
    account: PublicKey;
  };
}

export const addresses: Record<string, NetworkAddresses> = {
${networkEntries.join(',\n')},
};

// Helper function to get token addresses
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
`;
}

export async function saveAddressesToFile(): Promise<void> {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const addressesFilePath = path.join(__dirname, '../../common/addresses.ts');

  try {
    const content = generateAddressesFileContent();
    const prettierConfig = await prettier.resolveConfig(addressesFilePath);
    const formatted = await prettier.format(content, {
      ...prettierConfig,
      parser: 'typescript',
    });

    fs.writeFileSync(addressesFilePath, formatted, 'utf-8');
    console.log('✓ Addresses saved to common/addresses.ts');
  } catch (error) {
    console.error('❌ Failed to save addresses to file:', error);
    throw error;
  }
}
