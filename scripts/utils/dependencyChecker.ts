import * as fs from 'fs';
import * as path from 'path';

import { AnchorProvider } from '@coral-xyz/anchor';
import { Connection, PublicKey } from '@solana/web3.js';

import { createUserError, isAccountNotFoundError } from '@/common/errorHandler';
import { MProduct } from '@/common/tokenTypes';

import { getAcProgram } from '../deploy/contracts/ac';
import { getDataFeedProgram } from '../deploy/contracts/dataFeed';
import { getTokenAuthorityProgram } from '../deploy/contracts/token-authority';
import { getVaultsProgram } from '../deploy/contracts/vaults';

import { getTokenAddresses, getAcAddress, getAcRoleGlobalAddress } from './addressQueries';

export type RequiredComponent = 'mToken' | 'tokenAuthority' | 'mTokenDataFeed' | 'acRole';

const COMPONENT_DISPLAY_NAMES: Record<RequiredComponent, string> = {
  mToken: 'mToken',
  tokenAuthority: 'Token Authority',
  mTokenDataFeed: 'Data Feed',
  acRole: 'AC Role',
};

export function verifyNetworkInfrastructure(network: string): void {
  try {
    const ac = getAcAddress(network);
    const acRoleGlobal = getAcRoleGlobalAddress(network);

    if (!ac || !acRoleGlobal) {
      const missing: string[] = [];
      if (!acRoleGlobal) missing.push('AC Role Global');
      if (!ac) missing.push('AC');

      throw createUserError(
        `Network infrastructure not found for ${network}. Missing: ${missing.join(', ')}`,
        [`Run: yarn deploy:network --network ${network}`],
      );
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Network addresses not found')) {
      throw createUserError(`Network '${network}' not found.`, [
        `Run: yarn deploy:network --network ${network}`,
      ]);
    }
    throw error;
  }
}

export function verifyTokenComponents(
  network: string,
  tokenSymbol: MProduct,
  requiredComponents: RequiredComponent[],
): void {
  const tokenAddrs = getTokenAddresses(network, tokenSymbol);

  if (!tokenAddrs) {
    throw createUserError(`Token addresses not found for ${tokenSymbol} on ${network}.`, [
      `Run: yarn deploy:token-core --mtoken ${tokenSymbol} --network ${network}`,
    ]);
  }

  const missing: string[] = [];

  for (const component of requiredComponents) {
    const displayName = COMPONENT_DISPLAY_NAMES[component];
    if (
      (component === 'mToken' && !tokenAddrs.mToken) ||
      (component === 'tokenAuthority' && !tokenAddrs.tokenAuthority) ||
      (component === 'mTokenDataFeed' && !tokenAddrs.mTokenDataFeed) ||
      (component === 'acRole' && !tokenAddrs.acRole)
    ) {
      missing.push(displayName);
    }
  }

  if (missing.length > 0) {
    throw createUserError(
      `Required token components missing for ${tokenSymbol} on ${network}. Missing: ${missing.join(', ')}`,
      [`Run: yarn deploy:token-core --mtoken ${tokenSymbol} --network ${network}`],
    );
  }
}

export function verifyDependencies(
  network: string,
  tokenSymbol: MProduct,
  requiredComponents: RequiredComponent[],
): void {
  verifyNetworkInfrastructure(network);
  verifyTokenComponents(network, tokenSymbol, requiredComponents);
}

export function getDeployedTokenComponents(network: string, tokenSymbol: MProduct): string[] {
  const tokenAddrs = getTokenAddresses(network, tokenSymbol);
  if (!tokenAddrs) {
    return [];
  }

  const deployed: string[] = [];
  if (tokenAddrs.acRole) deployed.push('AC Role');
  if (tokenAddrs.mToken) deployed.push('mToken');
  if (tokenAddrs.tokenAuthority) deployed.push('Token Authority');
  if (tokenAddrs.mTokenDataFeed) deployed.push('Data Feed');
  if (tokenAddrs.minter) deployed.push('Minter Vault');
  if (tokenAddrs.redeemer) deployed.push('Redeemer Vault');

  return deployed;
}

export function verifyNoTokenComponentsDeployed(network: string, tokenSymbol: MProduct): void {
  const deployed = getDeployedTokenComponents(network, tokenSymbol);
  if (deployed.length === 0) {
    return;
  }

  const deployedList = deployed.join(', ');
  const tokenAddrs = getTokenAddresses(network, tokenSymbol);
  const missing: string[] = [];
  const steps: string[] = [];

  if (!tokenAddrs?.mTokenDataFeed) {
    missing.push('data feed');
    steps.push(`yarn deploy:token-datafeed --mtoken ${tokenSymbol} --network ${network}`);
  }

  if (!tokenAddrs?.minter || !tokenAddrs?.redeemer) {
    if (!tokenAddrs?.minter && !tokenAddrs?.redeemer) {
      missing.push('vaults');
    } else if (!tokenAddrs?.minter) {
      missing.push('minter vault');
    } else {
      missing.push('redeemer vault');
    }
    steps.push(`yarn deploy:token-vaults --mtoken ${tokenSymbol} --network ${network}`);
  }

  const suggestions =
    missing.length > 0
      ? `\n   Use incremental deployment instead:\n\n` +
        steps.map((s, i) => `   ${i + 1}. ${s}`).join('\n')
      : '';

  throw createUserError(
    `Token components already deployed for ${tokenSymbol} on ${network}. Deployed components: ${deployedList}`,
    [
      'deploy:all should only be used for fresh deployments',
      ...(suggestions ? [suggestions] : []),
      'Or remove deployed components from addresses.ts if you want to redeploy',
    ],
  );
}

export function getProgramIdFromIdl(programName: string): string | null {
  try {
    const idlPath = path.join(process.cwd(), 'target/idl', `${programName}.json`);
    if (fs.existsSync(idlPath)) {
      const idlContent = fs.readFileSync(idlPath, 'utf-8');
      const idl = JSON.parse(idlContent);
      return idl.address;
    }
  } catch {
    // Ignore errors
  }
  return null;
}

export function getProgramIds(): Record<string, string> | null {
  const accessControlId = getProgramIdFromIdl('access_control');
  const dataFeedId = getProgramIdFromIdl('data_feed');
  const midasVaultsId = getProgramIdFromIdl('midas_vaults');
  const tokenAuthorityId = getProgramIdFromIdl('token_authority');

  if (accessControlId && dataFeedId && midasVaultsId && tokenAuthorityId) {
    return {
      access_control: accessControlId,
      data_feed: dataFeedId,
      midas_vaults: midasVaultsId,
      token_authority: tokenAuthorityId,
    };
  }

  return null;
}

export async function verifyProgramsDeployed(
  connection: Connection,
  network: string,
): Promise<void> {
  const programIds = getProgramIds();

  if (!programIds) {
    console.log(`⚠️  Skipping program verification for ${network} (program IDs not available)`);
    return;
  }

  const missingPrograms: { name: string; id: string }[] = [];
  const verifiedPrograms: string[] = [];

  for (const [programName, programIdStr] of Object.entries(programIds)) {
    try {
      const programId = new PublicKey(programIdStr);
      const accountInfo = await connection.getAccountInfo(programId);

      if (!accountInfo || !accountInfo.executable) {
        missingPrograms.push({ name: programName, id: programIdStr });
      } else {
        verifiedPrograms.push(programName);
      }
    } catch {
      missingPrograms.push({ name: programName, id: programIdStr });
    }
  }

  if (verifiedPrograms.length > 0) {
    console.log(`  Programs verified: ${verifiedPrograms.join(', ')}`);
  }

  if (missingPrograms.length > 0) {
    const programList = missingPrograms.map((p) => `  - ${p.name} (${p.id})`).join('\n');
    throw createUserError(
      `Solana programs are not deployed on ${network}. Missing programs:\n${programList}`,
      [
        'Build programs: yarn build',
        `Deploy programs: anchor deploy --provider.cluster ${network.toLowerCase()}`,
        'Note: For localnet, make sure solana-test-validator is running.',
      ],
    );
  }
}

/**
 * Verify if an account exists on-chain
 * Returns true if account exists, false otherwise
 */
export async function verifyAccountExistsOnChain(
  connection: Connection,
  address: PublicKey,
): Promise<boolean> {
  try {
    const accountInfo = await connection.getAccountInfo(address);
    return accountInfo !== null;
  } catch {
    return false;
  }
}

/**
 * Verify if an Anchor account exists on-chain by attempting to fetch it
 * Returns true if account exists and is valid, false otherwise
 */
export async function verifyAnchorAccountExistsOnChain<T>(
  accountFetcher: (address: PublicKey) => Promise<T>,
  address: PublicKey,
): Promise<boolean> {
  try {
    await accountFetcher(address);
    return true;
  } catch (error) {
    if (isAccountNotFoundError(error)) {
      return false;
    }
    // Re-throw unexpected errors
    throw error;
  }
}

/**
 * Verify token core components exist on-chain
 * Returns object with verification results for each component
 */
export async function verifyTokenCoreOnChain(
  provider: AnchorProvider,
  network: string,
  tokenSymbol: MProduct,
): Promise<{
  acRole: { exists: boolean; address?: PublicKey };
  mToken: { exists: boolean; address?: PublicKey };
  tokenAuthority: { exists: boolean; address?: PublicKey };
}> {
  const tokenAddrs = getTokenAddresses(network, tokenSymbol);
  const results = {
    acRole: { exists: false, address: undefined as PublicKey | undefined },
    mToken: { exists: false, address: undefined as PublicKey | undefined },
    tokenAuthority: { exists: false, address: undefined as PublicKey | undefined },
  };

  // Verify AC Role
  if (tokenAddrs?.acRole) {
    results.acRole.address = tokenAddrs.acRole;
    const acProgram = getAcProgram(provider);
    results.acRole.exists = await verifyAnchorAccountExistsOnChain(
      (addr) => acProgram.account.accessControlRoleState.fetch(addr),
      tokenAddrs.acRole,
    );
  }

  // Verify mToken
  if (tokenAddrs?.mToken) {
    results.mToken.address = tokenAddrs.mToken;
    results.mToken.exists = await verifyAccountExistsOnChain(
      provider.connection,
      tokenAddrs.mToken,
    );
  }

  // Verify Token Authority
  if (tokenAddrs?.tokenAuthority) {
    results.tokenAuthority.address = tokenAddrs.tokenAuthority.account;
    const tokenAuthorityProgram = getTokenAuthorityProgram(provider);
    results.tokenAuthority.exists = await verifyAnchorAccountExistsOnChain(
      (addr) => tokenAuthorityProgram.account.tokenAuthorityState.fetch(addr),
      tokenAddrs.tokenAuthority.account,
    );
  }

  return results;
}

/**
 * Verify data feed exists on-chain
 */
export async function verifyDataFeedOnChain(
  provider: AnchorProvider,
  network: string,
  tokenSymbol: MProduct,
): Promise<{ exists: boolean; address?: PublicKey }> {
  const tokenAddrs = getTokenAddresses(network, tokenSymbol);
  if (!tokenAddrs?.mTokenDataFeed) {
    return { exists: false };
  }

  const dataFeedProgram = getDataFeedProgram(provider);
  const exists = await verifyAnchorAccountExistsOnChain(
    (addr) => dataFeedProgram.account.feedState.fetch(addr),
    tokenAddrs.mTokenDataFeed,
  );

  return { exists, address: tokenAddrs.mTokenDataFeed };
}

/**
 * Verify vaults exist on-chain
 */
export async function verifyVaultsOnChain(
  provider: AnchorProvider,
  network: string,
  tokenSymbol: MProduct,
): Promise<{
  minter: { exists: boolean; address?: PublicKey };
  redeemer: { exists: boolean; address?: PublicKey };
}> {
  const tokenAddrs = getTokenAddresses(network, tokenSymbol);
  const results = {
    minter: { exists: false, address: undefined as PublicKey | undefined },
    redeemer: { exists: false, address: undefined as PublicKey | undefined },
  };

  const vaultsProgram = getVaultsProgram(provider);

  // Verify Minter Vault
  if (tokenAddrs?.minter?.commonVault) {
    results.minter.address = tokenAddrs.minter.commonVault;
    results.minter.exists = await verifyAnchorAccountExistsOnChain(
      (addr) => vaultsProgram.account.vaultCommonState.fetch(addr),
      tokenAddrs.minter.commonVault,
    );
  }

  // Verify Redeemer Vault
  if (tokenAddrs?.redeemer?.commonVault) {
    results.redeemer.address = tokenAddrs.redeemer.commonVault;
    results.redeemer.exists = await verifyAnchorAccountExistsOnChain(
      (addr) => vaultsProgram.account.vaultCommonState.fetch(addr),
      tokenAddrs.redeemer.commonVault,
    );
  }

  return results;
}
