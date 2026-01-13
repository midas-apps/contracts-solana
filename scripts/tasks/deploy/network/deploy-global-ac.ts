import { AnchorProvider, Wallet } from '@coral-xyz/anchor';

import { createUserError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';

import { deployAc, DeployAcConfig } from '../../../deploy/ac';
import { getAcAddress, getAcRoleGlobalAddress } from '../../../utils/addressQueries';
import { registerGlobalAc } from '../../../utils/addressRegistry';
import { saveAddressesToFile } from '../../../utils/addressStorage';
import { getNetwork } from '../../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Wallet, network: string) {
  console.log(`Deploying Global AC for: ${network}`);

  const acRoleGlobal = getAcRoleGlobalAddress(network);
  if (!acRoleGlobal) {
    throw createUserError(`AC Role not found for network ${network}`, [
      `Run: yarn deploy:global-ac-role --network ${network}`,
    ]);
  }

  const existingAc = getAcAddress(network);
  if (existingAc) {
    console.log('✓ AC already deployed');
    console.log(`AC Role Global: ${acRoleGlobal.toString()}`);
    console.log(`AC: ${existingAc.toString()}`);
    return;
  }

  const common = { provider, payer, network };

  const acConfig: DeployAcConfig = {
    acRole: acRoleGlobal,
  };
  const ac = await deployAc(common, acConfig);

  registerGlobalAc(network, ac);
  await saveAddressesToFile();

  console.log('\n✅ AC deployment submitted');
  console.log(`AC Role Global: ${acRoleGlobal.toString()}`);
  console.log(`AC: ${ac.toString()}`);
  return;
}

const network = getNetwork();
executeNetworkScript(network, main, 'deployer');
