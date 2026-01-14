import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { PublicKey, Transaction } from '@solana/web3.js';

import { createUserError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';
import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';
import { AC_ROLES } from '@/test/constants/ac.constants';
import {
  acRoleToBuffer,
  getAccountAcRoleStatePda,
  fetchAccountAcRoleState,
} from '@/test/helpers/ac.helpers';

import { networkRolesConfigs } from '../../../configs/network-roles';
import { getAcProgram } from '../../../deploy/ac';
import { requireAcRoleGlobalAddress } from '../../../utils/addressValidators';
import { getNetwork } from '../../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Wallet, network: string) {
  console.log(`\n━━━ Grant Global AC ADMIN Role ━━━`);
  console.log(`Network: ${network}\n`);

  const networkRolesConfig = networkRolesConfigs[network];
  if (!networkRolesConfig) {
    throw createUserError(`Network roles config not found: ${network}`);
  }

  const globalAccessControlAdminAddress = new PublicKey(
    networkRolesConfig.accessControlAdminAddress,
  );

  const acRoleGlobal = requireAcRoleGlobalAddress(network);
  const acProgram = getAcProgram(provider);

  console.log(`Global AC Role:  ${acRoleGlobal.toString()}`);
  console.log(`Deployer:        ${payer.publicKey.toString()}`);
  console.log(`Global AC Admin: ${globalAccessControlAdminAddress.toString()}\n`);

  // Verify deployer has ADMIN role
  const deployerAdminPda = getAccountAcRoleStatePda(acRoleGlobal, payer.publicKey, AC_ROLES.ADMIN);
  const deployerHasAdmin = await fetchAccountAcRoleState(acProgram, deployerAdminPda, true);

  if (!deployerHasAdmin) {
    throw createUserError('Deployer missing ADMIN role on global AC', [
      'Deployer must have ADMIN role to grant it to Global AC Admin',
    ]);
  }

  // Check if global AC admin already has ADMIN role
  const globalAdminRolePda = getAccountAcRoleStatePda(
    acRoleGlobal,
    globalAccessControlAdminAddress,
    AC_ROLES.ADMIN,
  );
  const globalAdminHasRole = await fetchAccountAcRoleState(acProgram, globalAdminRolePda, true);

  if (globalAdminHasRole) {
    console.log('✓ ADMIN already granted to Global AC Admin');
    console.log(`\n→ Next: yarn global-ac:revoke-deployer --network ${network}\n`);
    return;
  }

  const tx = new Transaction().add(
    await acProgram.methods
      .grantRole(acRoleToBuffer(AC_ROLES.ADMIN))
      .accountsPartial({
        account: globalAccessControlAdminAddress,
        acRole: acRoleGlobal,
        authority: payer.publicKey,
        authorityAcAdminRole: deployerAdminPda,
        accountAcRole: globalAdminRolePda,
      })
      .instruction(),
  );

  const result = await sendAndWaitForCustomSolanaTxSign(provider, tx, [], {
    action: 'deployer',
    comment: 'Grant ADMIN for Global AC',
    waitForTx: true,
  });

  const txInfo = result.signature || result.txId;
  console.log(`✓ Global AC ADMIN granted | TX: ${txInfo}`);
  console.log(`\n→ Next: yarn global-ac:revoke-deployer --network ${network}\n`);
}

const network = getNetwork();
executeNetworkScript(network, main, 'deployer');
