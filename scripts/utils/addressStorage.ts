import * as fs from 'fs';
import * as path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import * as prettier from 'prettier';

import { addresses, TokenAddresses, NetworkAddresses, DataFeed } from '@/common/addresses';
import { MProduct, PaymentToken } from '@/common/tokenTypes';

// Formatting utilities
function formatPublicKey(pubkey: PublicKey): string {
  return `new PublicKey('${pubkey.toString()}')`;
}

function formatObject(parts: string[], indent = '        '): string {
  if (parts.length === 0) return '{}';
  return `{\n${indent}${parts.join(`,\n${indent}`)}\n      }`;
}

function formatTokenAuthority(
  tokenAuthority: { account: PublicKey; seed: string } | undefined,
): string {
  if (!tokenAuthority) return '';
  return formatObject([
    `account: ${formatPublicKey(tokenAuthority.account)}`,
    `seed: '${tokenAuthority.seed}'`,
  ]);
}

function formatVault(vault: { commonVault: PublicKey; account: PublicKey } | undefined): string {
  if (!vault) return '';
  return formatObject([
    `commonVault: ${formatPublicKey(vault.commonVault)}`,
    `account: ${formatPublicKey(vault.account)}`,
  ]);
}

function formatDataFeed(feed: DataFeed | undefined): string {
  if (!feed) return '';
  const parts: string[] = [];
  if (feed.token) parts.push(`token: ${formatPublicKey(feed.token)}`);
  if (feed.tokenProgram) {
    const tokenProgramStr = feed.tokenProgram.equals(TOKEN_PROGRAM_ID)
      ? 'TOKEN_PROGRAM_ID'
      : formatPublicKey(feed.tokenProgram);
    parts.push(`tokenProgram: ${tokenProgramStr}`);
  }
  if (feed.dataFeed) parts.push(`dataFeed: ${formatPublicKey(feed.dataFeed)}`);
  if (feed.underlyingFeed) parts.push(`underlyingFeed: ${formatPublicKey(feed.underlyingFeed)}`);
  return formatObject(parts);
}

// Code generation for addresses file
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

  if (tokenAddrs.mTokenUnderlyingFeed) {
    parts.push(`mTokenUnderlyingFeed: ${formatPublicKey(tokenAddrs.mTokenUnderlyingFeed)}`);
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
  if (networkAddrs.timelock) {
    parts.push(`timelock: ${formatObject([
      `multisig: ${formatPublicKey(networkAddrs.timelock.multisig)}`,
      `vault: ${formatPublicKey(networkAddrs.timelock.vault)}`,
    ])}`);
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

// Generate complete addresses file content
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
  timelock?: TimelockAddresses;
  tokens?: Partial<Record<MProduct, TokenAddresses>>;
  feeds?: Partial<Record<PaymentToken, DataFeed>>;
}

export interface TimelockAddresses {
  multisig: PublicKey;
  vault: PublicKey;
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
  mTokenUnderlyingFeed?: PublicKey;
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
  } catch (error) {
    console.error('❌ Failed to save addresses to file:', error);
    throw error;
  }
}
