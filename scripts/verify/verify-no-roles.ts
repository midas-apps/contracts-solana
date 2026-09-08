import {
  getMetadataPointerState,
  getMint,
  getPermanentDelegate,
  getTokenMetadata,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';
import { config } from 'dotenv';

import { addresses } from '@/common/addresses';
import { createUserError, handleError } from '@/common/errorHandler';
import { MProduct } from '@/common/tokenTypes';
import {
  getBooleanArg,
  getOptionalStringArrayArg,
  parsePublicKey,
} from '@/scripts/utils/argumentParser';
import { getNetworkConnection } from '@/scripts/utils/networkResolver';
import ACCESS_CONTROL_IDL from '@/target/idl/access_control.json' with { type: 'json' };

import { SOLANA_ROLES } from '../configs/roles-types';

config();

// ─── All known roles in the system ───────────────────────────────────────────
const ALL_ROLES = Object.values(SOLANA_ROLES);

// ─── AccountAccessControlRoleState Anchor discriminator ──────────────────────
const ACCOUNT_AC_ROLE_STATE_DISCRIMINATOR = Buffer.from([100, 17, 104, 157, 227, 195, 225, 30]);
const AC_PROGRAM_ID = new PublicKey(ACCESS_CONTROL_IDL.address);
const ACCOUNT_AC_ROLE_SEED = 'account_ac_role';

const BATCH_SIZE = 100;

const DEFAULT_NETWORKS = ['devnet', 'mainnet'] as const;

interface RoleHit {
  address: string;
  role: string;
  acRoleLabel: string;
  acRole: PublicKey;
  pda: PublicKey;
}

interface AuthorityHit {
  address: string;
  authorityType: string;
  tokenLabel: string;
  mint: PublicKey;
}

interface NetworkResult {
  network: string;
  hits: RoleHit[];
  authorityHits: AuthorityHit[];
  addressesClean: string[];
  phase2TotalAccounts: number | null;
  phase2MatchedCount: number;
  phase2Error: string | null;
  networkError: string | null;
}

function getConnection(network: string): Connection {
  console.log('  Using repo network resolver');
  return getNetworkConnection(network);
}

function getAccountAcRoleStatePda(acRole: PublicKey, account: PublicKey, role: string): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from(ACCOUNT_AC_ROLE_SEED), acRole.toBuffer(), account.toBuffer(), Buffer.from(role)],
    AC_PROGRAM_ID,
  );
  return pda;
}

function getTargetAddresses(): PublicKey[] {
  const addressArgs = getOptionalStringArrayArg('address') ?? getOptionalStringArrayArg('a');

  if (!addressArgs || addressArgs.length === 0) {
    throw createUserError('At least one address is required', [
      'Use --address <pubkey>',
      'Repeat --address for multiple addresses or pass a comma-separated list.',
    ]);
  }

  return [...new Set(addressArgs)].map((address) => parsePublicKey(address, 'address'));
}

function getNetworksToCheck(): string[] {
  const allNetworks = getBooleanArg('all-networks');
  const networkArgs = getOptionalStringArrayArg('network') ?? getOptionalStringArrayArg('n');

  if (allNetworks && networkArgs && networkArgs.length > 0) {
    throw createUserError('Use either --network or --all-networks true, not both');
  }

  const networks = allNetworks ? [...DEFAULT_NETWORKS] : networkArgs;
  if (!networks || networks.length === 0) {
    throw createUserError('Network is required', [
      'Use --network <network>',
      'Use --all-networks true to check devnet and mainnet.',
    ]);
  }

  const availableNetworks = Object.keys(addresses);
  for (const network of networks) {
    if (!addresses[network]) {
      throw createUserError(`Invalid network '${network}'`, [
        `Configured networks: ${availableNetworks.join(', ')}`,
      ]);
    }
  }

  return [...new Set(networks)];
}

function formatError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);

  const cause = (error as Error & { cause?: unknown }).cause;
  if (cause instanceof Error) {
    return `${error.message}: ${cause.message}`;
  }

  return error.message;
}

function printNetworkErrorHint(network: string, message: string) {
  if (
    message.includes('self-signed certificate') ||
    message.includes('DEPTH_ZERO_SELF_SIGNED_CERT')
  ) {
    console.log('  Hint: Node rejected the RPC TLS certificate.');
    console.log(
      `        Try: NODE_OPTIONS=--use-system-ca yarn tsx scripts/verify/verify-no-roles.ts`,
    );
    return;
  }

  console.log(`  Hint: check the configured ${network} RPC in scripts/utils/networkResolver.ts.`);
}

function failedNetworkResult(network: string, error: string): NetworkResult {
  return {
    network,
    hits: [],
    authorityHits: [],
    addressesClean: [],
    phase2TotalAccounts: null,
    phase2MatchedCount: 0,
    phase2Error: null,
    networkError: error,
  };
}

function collectAcRoles(network: string): { label: string; pubkey: PublicKey }[] {
  const networkAddrs = addresses[network];
  if (!networkAddrs) return [];

  const result: { label: string; pubkey: PublicKey }[] = [];

  if (networkAddrs.acRoleGlobal) {
    result.push({ label: 'global', pubkey: networkAddrs.acRoleGlobal });
  }

  if (networkAddrs.tokens) {
    for (const product of Object.values(MProduct)) {
      const tokenAddrs = networkAddrs.tokens[product];
      if (tokenAddrs?.acRole) {
        result.push({ label: product, pubkey: tokenAddrs.acRole });
      }
    }
  }

  return result;
}

function collectTokenMints(network: string): { label: string; mint: PublicKey }[] {
  const networkAddrs = addresses[network];
  if (!networkAddrs?.tokens) return [];

  const result: { label: string; mint: PublicKey }[] = [];

  for (const product of Object.values(MProduct)) {
    const mint = networkAddrs.tokens[product]?.mToken;
    if (mint) {
      result.push({ label: product, mint });
    }
  }

  return result;
}

async function batchGetAccounts(connection: Connection, pubkeys: PublicKey[]): Promise<boolean[]> {
  const results: boolean[] = [];

  for (let i = 0; i < pubkeys.length; i += BATCH_SIZE) {
    const batch = pubkeys.slice(i, i + BATCH_SIZE);
    const accounts = await connection.getMultipleAccountsInfo(batch);
    for (const acc of accounts) {
      results.push(acc !== null);
    }
  }

  return results;
}

async function phase1(
  connection: Connection,
  network: string,
  targetAddresses: PublicKey[],
): Promise<{ hits: RoleHit[]; derivedPdaSet: Set<string> }> {
  const acRoles = collectAcRoles(network);

  if (acRoles.length === 0) {
    console.log(`  No acRole addresses configured for ${network}, skipping Phase 1`);
    return { hits: [], derivedPdaSet: new Set() };
  }

  console.log(
    `  AC Role namespaces: ${acRoles.map((r) => `${r.label} (${r.pubkey.toBase58().slice(0, 8)}...)`).join(', ')}`,
  );

  const pdaEntries: {
    pda: PublicKey;
    address: string;
    role: string;
    acRoleLabel: string;
    acRole: PublicKey;
  }[] = [];

  for (const target of targetAddresses) {
    for (const acRole of acRoles) {
      for (const role of ALL_ROLES) {
        const pda = getAccountAcRoleStatePda(acRole.pubkey, target, role);
        pdaEntries.push({
          pda,
          address: target.toBase58(),
          role,
          acRoleLabel: acRole.label,
          acRole: acRole.pubkey,
        });
      }
    }
  }

  const totalChecks = pdaEntries.length;
  console.log(
    `  Checking ${targetAddresses.length} address(es) x ${acRoles.length} acRole(s) x ${ALL_ROLES.length} role(s) = ${totalChecks} PDAs...`,
  );

  const allPdas = pdaEntries.map((e) => e.pda);
  const existsResults = await batchGetAccounts(connection, allPdas);

  const hits: RoleHit[] = [];
  const derivedPdaSet = new Set<string>();

  for (let i = 0; i < pdaEntries.length; i++) {
    derivedPdaSet.add(pdaEntries[i].pda.toBase58());
    if (existsResults[i]) {
      hits.push({
        address: pdaEntries[i].address,
        role: pdaEntries[i].role,
        acRoleLabel: pdaEntries[i].acRoleLabel,
        acRole: pdaEntries[i].acRole,
        pda: pdaEntries[i].pda,
      });
    }
  }

  return { hits, derivedPdaSet };
}

async function verifyAuthorities(
  connection: Connection,
  network: string,
  targetAddresses: PublicKey[],
): Promise<AuthorityHit[]> {
  const tokenMints = collectTokenMints(network);
  const targetSet = new Set(targetAddresses.map((address) => address.toBase58()));
  const hits: AuthorityHit[] = [];

  if (tokenMints.length === 0) {
    console.log(`  No token mint addresses configured for ${network}, skipping authority checks`);
    return hits;
  }

  console.log(`\n  Authority checks: ${tokenMints.length} configured token mint(s)...`);

  for (const token of tokenMints) {
    try {
      const mint = await getMint(connection, token.mint, undefined, TOKEN_2022_PROGRAM_ID);
      const permanentDelegate = getPermanentDelegate(mint);
      const metadataPointer = getMetadataPointerState(mint);
      const tokenMetadata = await getTokenMetadata(
        connection,
        token.mint,
        undefined,
        TOKEN_2022_PROGRAM_ID,
      );

      const authorities: { authorityType: string; address?: PublicKey | null }[] = [
        { authorityType: 'MintTokens', address: mint.mintAuthority },
        { authorityType: 'FreezeAccount', address: mint.freezeAuthority },
        { authorityType: 'PermanentDelegate', address: permanentDelegate?.delegate },
        { authorityType: 'MetadataPointer', address: metadataPointer?.authority },
        { authorityType: 'TokenMetadataUpdateAuthority', address: tokenMetadata?.updateAuthority },
      ];

      for (const authority of authorities) {
        const address = authority.address?.toBase58();
        if (!address || !targetSet.has(address)) continue;

        hits.push({
          address,
          authorityType: authority.authorityType,
          tokenLabel: token.label,
          mint: token.mint,
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(
        `  ⚠ Could not check authorities for ${token.label} (${token.mint.toBase58()}): ${message}`,
      );
    }
  }

  if (hits.length === 0) {
    console.log('  ✓ No checked addresses hold token authorities');
  }

  return hits;
}

async function phase2(
  connection: Connection,
  derivedPdaSet: Set<string>,
): Promise<{ totalAccounts: number; matchedCount: number } | { error: string }> {
  try {
    const accounts = await connection.getProgramAccounts(AC_PROGRAM_ID, {
      filters: [
        {
          memcmp: {
            offset: 0,
            bytes: ACCOUNT_AC_ROLE_STATE_DISCRIMINATOR.toString('base64'),
            encoding: 'base64',
          },
        },
      ],
      dataSlice: { offset: 0, length: 0 },
    });

    const totalAccounts = accounts.length;
    let matchedCount = 0;

    for (const acc of accounts) {
      if (derivedPdaSet.has(acc.pubkey.toBase58())) {
        matchedCount++;
      }
    }

    return { totalAccounts, matchedCount };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: message };
  }
}

async function verifyNetwork(
  network: string,
  targetAddresses: PublicKey[],
): Promise<NetworkResult> {
  console.log(`\n${'━'.repeat(60)}`);
  console.log(`  Role Verification: ${network}`);
  console.log(`${'━'.repeat(60)}\n`);

  const connection = getConnection(network);

  const { hits, derivedPdaSet } = await phase1(connection, network, targetAddresses);
  const authorityHits = await verifyAuthorities(connection, network, targetAddresses);

  const addressesWithRoles = new Set([
    ...hits.map((h) => h.address),
    ...authorityHits.map((h) => h.address),
  ]);
  const addressesClean = targetAddresses
    .map((a) => a.toBase58())
    .filter((a) => !addressesWithRoles.has(a));

  console.log('');

  for (const addr of targetAddresses.map((a) => a.toBase58())) {
    const addrHits = hits.filter((h) => h.address === addr);
    if (addrHits.length > 0) {
      console.log(`  ⚠ WARNING: ${addr} has roles:`);
      for (const hit of addrHits) {
        console.log(`     • ${hit.role} (acRole: ${hit.acRoleLabel})`);
      }
    } else {
      console.log(`  ✓ ${addr} has NO roles`);
    }

    const addrAuthorityHits = authorityHits.filter((h) => h.address === addr);
    if (addrAuthorityHits.length > 0) {
      console.log(`  ⚠ WARNING: ${addr} has token authorities:`);
      for (const hit of addrAuthorityHits) {
        console.log(
          `     • ${hit.authorityType} (${network} / token: ${hit.tokenLabel}, mint: ${hit.mint.toBase58()})`,
        );
      }
    }
  }

  console.log(`\n  Phase 2: On-chain scan (getProgramAccounts)...`);
  const phase2Result = await phase2(connection, derivedPdaSet);

  let phase2TotalAccounts: number | null = null;
  let phase2MatchedCount = 0;
  let phase2Error: string | null = null;

  if ('error' in phase2Result) {
    phase2Error = phase2Result.error;
    console.log(`  ⚠ getProgramAccounts failed: ${phase2Error}`);
    console.log(`  Phase 1 results are still valid.`);
  } else {
    phase2TotalAccounts = phase2Result.totalAccounts;
    phase2MatchedCount = phase2Result.matchedCount;
    const unmatched = phase2TotalAccounts - phase2MatchedCount;
    console.log(`  Found ${phase2TotalAccounts} total role PDA(s) on-chain`);
    if (phase2MatchedCount > 0) {
      console.log(`  ├ ${phase2MatchedCount} matched target addresses (reported above)`);
    }
    if (unmatched > 0) {
      console.log(`  └ ${unmatched} belong to other addresses/roles`);
    }
  }

  return {
    network,
    hits,
    authorityHits,
    addressesClean,
    phase2TotalAccounts,
    phase2MatchedCount,
    phase2Error,
    networkError: null,
  };
}

async function main() {
  const targetAddresses = getTargetAddresses();
  const targetAddressStrings = targetAddresses.map((address) => address.toBase58());
  const networks = getNetworksToCheck();

  console.log(
    `\nVerifying ${targetAddresses.length} address(es) across ${networks.length} network(s)\n`,
  );
  console.log('Addresses:');
  for (const addr of targetAddressStrings) {
    console.log(`  ${addr}`);
  }

  const allResults: NetworkResult[] = [];

  for (const network of networks) {
    try {
      const result = await verifyNetwork(network, targetAddresses);
      allResults.push(result);
    } catch (error) {
      const message = formatError(error);
      console.log(`\n  ⚠ Network verification failed for ${network}: ${message}`);
      printNetworkErrorHint(network, message);
      allResults.push(failedNetworkResult(network, message));
    }
  }

  // ─── Final Summary ───────────────────────────────────────────────────────
  console.log(`\n${'━'.repeat(60)}`);
  console.log('  FINAL SUMMARY');
  console.log(`${'━'.repeat(60)}\n`);

  const allHits = allResults.flatMap((r) => r.hits.map((h) => ({ ...h, network: r.network })));
  const allAuthorityHits = allResults.flatMap((r) =>
    r.authorityHits.map((h) => ({ ...h, network: r.network })),
  );
  const warningAddresses = new Set([
    ...allHits.map((h) => h.address),
    ...allAuthorityHits.map((h) => h.address),
  ]);
  const networkErrors = allResults.filter((r) => r.networkError);
  const cleanAddresses = targetAddressStrings.filter((a) => !warningAddresses.has(a));

  if (allHits.length > 0 || allAuthorityHits.length > 0) {
    console.log(
      `  ⚠ WARNINGS: ${warningAddresses.size} address(es) with roles/authorities found!\n`,
    );
    for (const addr of warningAddresses) {
      const addrHits = allHits.filter((h) => h.address === addr);
      const addrAuthorityHits = allAuthorityHits.filter((h) => h.address === addr);
      console.log(`  ${addr}:`);
      for (const hit of addrHits) {
        console.log(`     • role: ${hit.role} (${hit.network} / acRole: ${hit.acRoleLabel})`);
      }
      for (const hit of addrAuthorityHits) {
        console.log(
          `     • authority: ${hit.authorityType} (${hit.network} / token: ${hit.tokenLabel}, mint: ${hit.mint.toBase58()})`,
        );
      }
    }
    console.log('');
  }

  if (cleanAddresses.length > 0) {
    console.log(`  ✓ CLEAN: ${cleanAddresses.length} address(es) with no roles`);
    for (const addr of cleanAddresses) {
      console.log(`     ${addr}`);
    }
  }

  if (networkErrors.length > 0) {
    console.log(`\n  ⚠ INCOMPLETE: ${networkErrors.length} network check(s) failed`);
    for (const result of networkErrors) {
      console.log(`     ${result.network}: ${result.networkError}`);
    }
  }

  console.log('');

  if (allHits.length > 0 || allAuthorityHits.length > 0) {
    process.exit(1);
  }

  if (networkErrors.length > 0) {
    process.exit(2);
  }
}

main().catch(handleError);

// Usage:
// yarn tsx scripts/verify/verify-no-roles.ts --network mainnet --address <pubkey>
// yarn tsx scripts/verify/verify-no-roles.ts --all-networks true --address <pubkey-1>,<pubkey-2>
