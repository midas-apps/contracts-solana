import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';

import {
  needsGlobalAddressesDeployment,
  getAcAddress,
  getAcRoleGlobalAddress,
} from '../../utils/addressQueries';
import { registerGlobalAddresses } from '../../utils/addressRegistry';
import { deployAcRole, deployAc, DeployAcRoleConfig, DeployAcConfig } from '../contracts/ac';

export interface NetworkInfrastructureResult {
  acRoleGlobal: PublicKey;
  ac: PublicKey;
  alreadyDeployed: boolean;
}

/**
 * Deploy network infrastructure (AC + AC Role Global)
 * This should be deployed once per network and is shared across all tokens
 *
 * @param provider - Anchor provider
 * @param payer - Payer keypair
 * @param network - Network name (e.g., "localnet", "devnet")
 * @returns Deployed addresses
 */
export async function deployNetworkInfrastructure(
  provider: AnchorProvider,
  payer: Keypair,
  network: string,
): Promise<NetworkInfrastructureResult> {
  // Check if already deployed
  if (!needsGlobalAddressesDeployment(network)) {
    try {
      const acRoleGlobal = getAcRoleGlobalAddress(network);
      const ac = getAcAddress(network);

      if (acRoleGlobal && ac) {
        console.log('  ✓ Network infrastructure already deployed');
        console.log(`    AC Role Global: ${acRoleGlobal.toString()}`);
        console.log(`    AC: ${ac.toString()}`);
        return { acRoleGlobal, ac, alreadyDeployed: true };
      }
    } catch {
      // If network doesn't exist or addresses are missing, proceed with deployment
    }
  }

  console.log('  [1/2] Deploying AC Role Global...');
  const acRoleGlobalConfig: DeployAcRoleConfig = {};
  const acRoleGlobal = await deployAcRole({ provider, payer }, acRoleGlobalConfig);
  console.log(`    AC Role Global: ${acRoleGlobal.toString()}`);

  // Verify the account is properly initialized
  const { getAcProgram } = await import('../contracts/ac');
  const acProgram = getAcProgram(provider);
  await acProgram.account.accessControlRoleState.fetch(acRoleGlobal);

  console.log('  [2/2] Deploying AC...');
  const acConfig: DeployAcConfig = {
    acRole: acRoleGlobal,
  };
  const ac = await deployAc({ provider, payer }, acConfig);
  console.log(`    AC: ${ac.toString()}`);

  // Register global addresses
  registerGlobalAddresses(network, acRoleGlobal, ac);

  // Auto-save addresses to file
  const { saveAddressesToFile } = await import('../../utils/addressStorage');
  await saveAddressesToFile();

  return { acRoleGlobal, ac, alreadyDeployed: false };
}
