import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';

import { executeNetworkScript } from '@/common/scriptRunner';

import {
  deployAcRole,
  deployAc,
  DeployAcRoleConfig,
  DeployAcConfig,
  getAcProgram,
} from '../../deploy/ac';
import {
  needsGlobalAddressesDeployment,
  getAcAddress,
  getAcRoleGlobalAddress,
} from '../../utils/addressQueries';
import { registerGlobalAddresses } from '../../utils/addressRegistry';
import { saveAddressesToFile } from '../../utils/addressStorage';
import { getNetwork } from '../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Keypair) {
  const network = getNetwork();

  console.log(`Deploying network infrastructure for: ${network}`);

  if (!needsGlobalAddressesDeployment(network)) {
    try {
      const acRoleGlobal = getAcRoleGlobalAddress(network);
      const ac = getAcAddress(network);

      if (acRoleGlobal && ac) {
        console.log('✓ Network infrastructure already deployed');
        console.log(`AC Role Global: ${acRoleGlobal.toString()}`);
        console.log(`AC: ${ac.toString()}`);
        return;
      }
    } catch {
      // Proceed with deployment
    }
  }

  const acRoleGlobalConfig: DeployAcRoleConfig = {};
  const acRoleGlobal = await deployAcRole({ provider, payer }, acRoleGlobalConfig);

  const acProgram = getAcProgram(provider);
  await acProgram.account.accessControlRoleState.fetch(acRoleGlobal);

  const acConfig: DeployAcConfig = {
    acRole: acRoleGlobal,
  };
  const ac = await deployAc({ provider, payer }, acConfig);

  registerGlobalAddresses(network, acRoleGlobal, ac);
  await saveAddressesToFile();

  console.log('✅ Network infrastructure deployed successfully');
  console.log(`AC Role Global: ${acRoleGlobal.toString()}`);
  console.log(`AC: ${ac.toString()}`);
}

const network = getNetwork();
executeNetworkScript(network, main);
