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

  // Roles to grant to global AC admin
  const rolesToGrant = [AC_ROLES.ADMIN, AC_ROLES.UPDATE_ACCOUNT_AC];

  const toGrant: { role: string; pda: PublicKey }[] = [];

  for (const role of rolesToGrant) {
    const rolePda = getAccountAcRoleStatePda(acRoleGlobal, globalAccessControlAdminAddress, role);
    const hasRole = await fetchAccountAcRoleState(acProgram, rolePda, true);

    if (hasRole) {
      console.log(`✓ ${role.replace('_role', '')} already granted`);
    } else {
      toGrant.push({ role, pda: rolePda });
    }
  }

  if (toGrant.length === 0) {
    console.log('\n✓ All roles already granted to Global AC Admin');
    console.log(`\n→ Next: yarn global-ac:revoke-deployer --network ${network}\n`);
    return;
  }

  console.log(`\nGranting: ${toGrant.map((r) => r.role.replace('_role', '')).join(', ')}\n`);

  const tx = new Transaction();
  for (const { role, pda } of toGrant) {
    tx.add(
      await acProgram.methods
        .grantRole(acRoleToBuffer(role))
        .accountsPartial({
          account: globalAccessControlAdminAddress,
          acRole: acRoleGlobal,
          authority: payer.publicKey,
          authorityAcAdminRole: deployerAdminPda,
          accountAcRole: pda,
        })
        .instruction(),
    );
  }

  const result = await sendAndWaitForCustomSolanaTxSign(provider, tx, [], {
    action: 'deployer',
    comment: 'Grant roles for Global AC',
    waitForTx: true,
  });

  const txInfo = result.signature || result.txId;
  console.log(`✓ ${toGrant.length} role(s) granted | TX: ${txInfo}`);
  console.log(`\n→ Next: yarn global-ac:revoke-deployer --network ${network}\n`);
}

const network = getNetwork();
executeNetworkScript(network, main, 'deployer');
