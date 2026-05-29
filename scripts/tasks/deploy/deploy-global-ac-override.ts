import { AnchorProvider, Wallet } from '@coral-xyz/anchor';

import { createUserError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';

import { deployAc, DeployAcConfig } from '../../deploy/ac';
import { getTokenAddresses } from '../../utils/addressQueries';
import { registerAddress } from '../../utils/addressRegistry';
import { saveAddressesToFile } from '../../utils/addressStorage';
import { getMtoken, getNetwork } from '../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Wallet, network: string) {
  const mtoken = getMtoken();

  console.log(`Deploying Global AC Override for: ${mtoken} on ${network}`);

  const addresses = getTokenAddresses(network, mtoken);

  if (!addresses?.acGlobalOverride?.acRole) {
    throw createUserError(`Token AC Role Global Override not found for ${mtoken} on ${network}`, [
      `Run: yarn deploy:token-ac-role:global-override --mtoken ${mtoken} --network ${network}`,
    ]);
  }

  if (addresses?.acGlobalOverride?.ac) {
    console.log('✓ AC Global Override already deployed');
    console.log(`AC Global Override: ${addresses.acGlobalOverride.ac.toString()}`);
    console.log(`AC Role Global Override: ${addresses.acGlobalOverride.acRole.toString()}`);
    return;
  }

  const common = { provider, payer, network };

  const acConfig: DeployAcConfig = {
    acRole: addresses?.acGlobalOverride?.acRole,
  };
  const ac = await deployAc(common, acConfig);

  registerAddress(network, mtoken, 'acGlobalOverride', {
    ac,
    acRole: addresses?.acGlobalOverride?.acRole,
  });

  await saveAddressesToFile();

  console.log('\n✅ AC Global Override deployment submitted');
  console.log(`AC Global Override: ${ac.toString()}`);
  console.log(`AC Role Global Override: ${addresses?.acGlobalOverride?.acRole.toString()}`);
  return;
}

const network = getNetwork();
executeNetworkScript(network, main, 'deployer');
