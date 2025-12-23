import { AnchorProvider, Wallet } from '@coral-xyz/anchor';

import { executeNetworkScript } from '@/common/scriptRunner';

import { deployAcRole, DeployAcRoleConfig } from '../../../deploy/ac';
import { getAcRoleGlobalAddress } from '../../../utils/addressQueries';
import { registerGlobalAcRole } from '../../../utils/addressRegistry';
import { saveAddressesToFile } from '../../../utils/addressStorage';
import { getNetwork } from '../../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Wallet, network: string) {
  console.log(`[1/2] Deploying AC Role for: ${network}`);

  const existingAcRoleGlobal = getAcRoleGlobalAddress(network);
  if (existingAcRoleGlobal) {
    console.log('✓ AC Role already deployed');
    console.log(`AC Role Global: ${existingAcRoleGlobal.toString()}`);
    return;
  }

  const common = { provider, payer, network };

  const acRoleGlobalConfig: DeployAcRoleConfig = {};
  const acRoleGlobal = await deployAcRole(common, acRoleGlobalConfig);

  registerGlobalAcRole(network, acRoleGlobal);
  await saveAddressesToFile();

  console.log('\n✅ AC Role deployment submitted');
  console.log(`AC Role Global: ${acRoleGlobal.toString()}`);
  console.log(`\nNext step: yarn deploy:network:02 --network ${network}`);
  return;
}

const network = getNetwork();
executeNetworkScript(network, main, 'deployer');
