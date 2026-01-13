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
  console.log(`\n━━━ Revoke Deployer's Global AC ADMIN Role ━━━`);
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
    console.log('✓ Deployer already has no ADMIN role on global AC\n');
    return;
  }

  // Safety check: Ensure global AC admin has ADMIN before revoking from deployer
  const globalAdminRolePda = getAccountAcRoleStatePda(
    acRoleGlobal,
    globalAccessControlAdminAddress,
    AC_ROLES.ADMIN,
  );
  const globalAdminHasRole = await fetchAccountAcRoleState(acProgram, globalAdminRolePda, true);

  if (!globalAdminHasRole) {
    throw createUserError('Global AC Admin does not have ADMIN role', [
      'Cannot safely revoke deployer ADMIN until Global AC Admin has ADMIN',
      `Run: yarn global-ac:grant-admin --network ${network}`,
    ]);
  }

  const tx = new Transaction().add(
    await acProgram.methods
      .revokeRole(acRoleToBuffer(AC_ROLES.ADMIN))
      .accountsPartial({
        account: payer.publicKey,
        acRole: acRoleGlobal,
        authority: payer.publicKey,
        authorityAcAdminRole: deployerAdminPda,
        accountAcRole: deployerAdminPda,
      })
      .instruction(),
  );

  const result = await sendAndWaitForCustomSolanaTxSign(provider, tx, [], {
    action: 'deployer',
    comment: 'Revoke deployer ADMIN from Global AC',
    waitForTx: false,
  });

  const txInfo = result.signature || result.txId;
  console.log(`✓ Deployer ADMIN revoked from Global AC | TX: ${txInfo}\n`);
}

const network = getNetwork();
executeNetworkScript(network, main, 'deployer');
