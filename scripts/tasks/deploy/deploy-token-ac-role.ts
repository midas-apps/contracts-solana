import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

import { createUserError, isAccountNotFoundError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';

import { deployAcRole, getAcProgram } from '../../deploy/ac';
import { getTokenAddresses } from '../../utils/addressQueries';
import { registerAddress } from '../../utils/addressRegistry';
import { saveAddressesToFile } from '../../utils/addressStorage';
import { getMtoken, getNetwork } from '../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Wallet, network: string) {
  const mtoken = getMtoken();

  console.log(`Deploying token AC Role for: ${mtoken}`);

  const existingAddresses = getTokenAddresses(network, mtoken);
  const acProgram = getAcProgram(provider);

  let acRole: PublicKey;
  if (existingAddresses?.acRole) {
    try {
      await acProgram.account.accessControlRoleState.fetch(existingAddresses.acRole);
      acRole = existingAddresses.acRole;
      console.log(`✓ AC Role already exists: ${acRole.toString()}`);
    } catch (error) {
      if (isAccountNotFoundError(error)) {
        acRole = await deployAcRole({ provider, payer }, {});
      } else {
        throw createUserError('AC Role in addresses.ts does not exist on-chain', [
          'Remove the address from addresses.ts or verify the account exists',
        ]);
      }
    }
  } else {
    acRole = await deployAcRole({ provider, payer }, {});
  }

  registerAddress(network, mtoken, 'acRole', acRole);
  await saveAddressesToFile();

  console.log('✅ Token AC Role deployed successfully');
  console.log(`AC Role: ${acRole.toString()}`);
}

const network = getNetwork();
executeNetworkScript(network, main, 'deployer');
