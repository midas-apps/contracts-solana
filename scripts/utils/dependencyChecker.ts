import * as fs from 'fs';
import * as path from 'path';

import { Connection, PublicKey } from '@solana/web3.js';

import { MProduct } from '@/common/tokenTypes';

import { getTokenAddresses } from './addressManager';
import { getAcAddress, getAcRoleGlobalAddress } from './networkResolver';

export type RequiredComponent = 'mToken' | 'tokenAuthority' | 'mTokenDataFeed' | 'acRole';

/**
 * Verify that network infrastructure (AC + AC Role Global) is deployed
 * Throws an error with helpful message if missing
 */
export function verifyNetworkInfrastructure(network: string): void {
  try {
    const ac = getAcAddress(network);
    const acRoleGlobal = getAcRoleGlobalAddress(network);

    if (!ac || !acRoleGlobal) {
      const missing: string[] = [];
      if (!acRoleGlobal) missing.push('AC Role Global');
      if (!ac) missing.push('AC');

      throw new Error(
        `Network infrastructure not found for ${network}. Missing: ${missing.join(', ')}\n` +
          `Please run: yarn deploy:network --network ${network}`,
      );
    }
  } catch (error) {
    // If network doesn't exist or addresses are missing, provide helpful error
    if (error instanceof Error && error.message.includes('Network addresses not found')) {
      throw new Error(
        `Network '${network}' not found or network infrastructure not deployed.\n` +
          `Please run: yarn deploy:network --network ${network}`,
      );
    }
    // Re-throw if it's already our formatted error
    throw error;
  }
}

/**
 * Verify that required token components are deployed
 * Throws an error with helpful message if any are missing
 */
export function verifyTokenComponents(
  network: string,
  tokenSymbol: MProduct,
  requiredComponents: RequiredComponent[],
): void {
  const tokenAddrs = getTokenAddresses(network, tokenSymbol);

  if (!tokenAddrs) {
    throw new Error(
      `Token addresses not found for ${tokenSymbol} on ${network}.\n` +
        `Please deploy the token first: yarn deploy:token --mtoken ${tokenSymbol} --network ${network}`,
    );
  }

  const missing: string[] = [];

  for (const component of requiredComponents) {
    switch (component) {
      case 'mToken':
        if (!tokenAddrs.mToken) {
          missing.push('mToken');
        }
        break;
      case 'tokenAuthority':
        if (!tokenAddrs.tokenAuthority) {
          missing.push('Token Authority');
        }
        break;
      case 'mTokenDataFeed':
        if (!tokenAddrs.mTokenDataFeed) {
          missing.push('Data Feed');
        }
        break;
      case 'acRole':
        if (!tokenAddrs.acRole) {
          missing.push('AC Role');
        }
        break;
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Required token components missing for ${tokenSymbol} on ${network}.\n` +
        `Missing: ${missing.join(', ')}\n` +
        `Please deploy missing components or run full token deployment:\n` +
        `  yarn deploy:token --mtoken ${tokenSymbol} --network ${network}`,
    );
  }
}

/**
 * Verify both network infrastructure and token components
 */
export function verifyDependencies(
  network: string,
  tokenSymbol: MProduct,
  requiredComponents: RequiredComponent[],
): void {
  verifyNetworkInfrastructure(network);
  verifyTokenComponents(network, tokenSymbol, requiredComponents);
}

/**
 * Get program ID from IDL file
 */
export function getProgramIdFromIdl(programName: string): string | null {
  try {
    const idlPath = path.join(process.cwd(), 'target/idl', `${programName}.json`);
    if (fs.existsSync(idlPath)) {
      const idlContent = fs.readFileSync(idlPath, 'utf-8');
      const idl = JSON.parse(idlContent);
      return idl.address;
    }
  } catch {
    // Ignore errors, return null
  }
  return null;
}

/** Get program IDs from IDL files */
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

/**
 * Verify that Solana programs are deployed on the network
 * Throws an error with helpful message if any programs are missing
 */
export async function verifyProgramsDeployed(
  connection: Connection,
  network: string,
): Promise<void> {
  const programIds = getProgramIds();

  if (!programIds) {
    // For unknown networks or if IDL files are not available, skip program verification
    // (they might use different addresses or programs might not be built yet)
    console.log(`⚠️  Skipping program verification for ${network} (program IDs not available)`);
    return;
  }

  const missingPrograms: { name: string; id: string }[] = [];
  const verifiedPrograms: string[] = [];

  for (const [programName, programIdStr] of Object.entries(programIds)) {
    try {
      const programId = new PublicKey(programIdStr);
      const accountInfo = await connection.getAccountInfo(programId);

      if (!accountInfo) {
        missingPrograms.push({ name: programName, id: programIdStr });
      } else if (!accountInfo.executable) {
        missingPrograms.push({ name: programName, id: programIdStr });
      } else {
        verifiedPrograms.push(programName);
      }
    } catch {
      // If we can't parse the address or fetch it, consider it missing
      missingPrograms.push({ name: programName, id: programIdStr });
    }
  }

  if (verifiedPrograms.length > 0) {
    console.log(`  Programs verified: ${verifiedPrograms.join(', ')}`);
  }

  if (missingPrograms.length > 0) {
    const programList = missingPrograms.map((p) => `  - ${p.name} (${p.id})`).join('\n');
    throw new Error(
      `Solana programs are not deployed on ${network}.\n` +
        `Missing programs:\n${programList}\n\n` +
        `Please deploy programs first:\n` +
        `  1. Build programs: yarn build\n` +
        `  2. Deploy programs: anchor deploy --provider.cluster ${network.toLowerCase()}\n\n` +
        `Note: For localnet, make sure solana-test-validator is running.`,
    );
  }
}
