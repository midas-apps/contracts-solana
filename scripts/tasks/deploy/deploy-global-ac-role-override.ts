import { AnchorProvider, Wallet } from '@coral-xyz/anchor';

import { executeNetworkScript } from '@/common/scriptRunner';

import { deployAcRole, DeployAcRoleConfig } from '../../deploy/ac';
import { getTokenAddresses } from '../../utils/addressQueries';
import { registerAddress } from '../../utils/addressRegistry';
import { saveAddressesToFile } from '../../utils/addressStorage';
import { getMtoken, getNetwork } from '../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Wallet, network: string) {
  const mtoken = getMtoken();

  console.log(`Deploying Global AC Role Override for: ${mtoken} on ${network}`);

  const addresses = getTokenAddresses(network, mtoken);

  if (addresses?.acGlobalOverride?.acRole) {
    console.log('✓ AC Role Global Override already deployed');
    console.log(`AC Role Global Override: ${addresses.acGlobalOverride.acRole.toString()}`);
    return;
  }

  const common = { provider, payer, network };

  const acRoleGlobalConfig: DeployAcRoleConfig = {};
  const acRoleGlobal = await deployAcRole(common, acRoleGlobalConfig);

  registerAddress(network, mtoken, 'acGlobalOverride', {
    acRole: acRoleGlobal,
    ac: addresses?.acGlobalOverride?.ac,
  });

  await saveAddressesToFile();

  console.log('\n✅ AC Role deployment submitted');
  console.log(`AC Role Global Override: ${acRoleGlobal.toString()}`);
  console.log(
    `\nNext step: yarn deploy:token-ac:global-override --mtoken ${mtoken} --network ${network}`,
  );
  return;
}

const network = getNetwork();
executeNetworkScript(network, main, 'deployer');
