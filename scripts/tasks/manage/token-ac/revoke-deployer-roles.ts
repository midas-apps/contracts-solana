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
import { DEPLOYER_AUTO_ROLES } from '../../../configs/roles-types';
import { getAcProgram } from '../../../deploy/ac';
import { getTokenAddresses } from '../../../utils/addressQueries';
import { getMtoken, getNetwork } from '../../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Wallet, network: string) {
  const mtoken = getMtoken();

  console.log(`\n━━━ Step 2/3: Revoke Deployer Roles ━━━`);
  console.log(`Token: ${mtoken} | Network: ${network}\n`);

  const networkRolesConfig = networkRolesConfigs[network];
  if (!networkRolesConfig) {
    throw createUserError(`Network roles config not found: ${network}`);
  }

  const accessControlAdminAddress = new PublicKey(networkRolesConfig.accessControlAdminAddress);

  const tokenAddrs = getTokenAddresses(network, mtoken);
  if (!tokenAddrs?.acRole) {
    throw createUserError(`AC Role not found for ${mtoken} on ${network}`, [
      `Run: yarn deploy:token-ac-role --mtoken ${mtoken} --network ${network}`,
    ]);
  }

  const acProgram = getAcProgram(provider);
  const acRole = tokenAddrs.acRole;

  console.log(`Deployer:  ${payer.publicKey.toString()}`);
  console.log(`AC Admin:  ${accessControlAdminAddress.toString()}\n`);

  // Verify deployer has ADMIN role (needed as authority to revoke roles)
  const deployerAdminRolePda = getAccountAcRoleStatePda(acRole, payer.publicKey, AC_ROLES.ADMIN);
  const deployerHasAdmin = await fetchAccountAcRoleState(acProgram, deployerAdminRolePda, true);

  if (!deployerHasAdmin) {
    throw createUserError('Deployer does not have ADMIN role', [
      'Cannot revoke roles without ADMIN authority',
    ]);
  }

  // Check if AC Admin already has ADMIN role (safe to revoke deployer's ADMIN)
  const acAdminRolePda = getAccountAcRoleStatePda(
    acRole,
    accessControlAdminAddress,
    AC_ROLES.ADMIN,
  );
  const acAdminHasAdmin = await fetchAccountAcRoleState(acProgram, acAdminRolePda, true);
  const canRevokeAdmin = acAdminHasAdmin !== null;

  // Check which roles deployer currently has
  const deployerRoles: { role: string; exists: boolean }[] = [];
  for (const role of DEPLOYER_AUTO_ROLES) {
    const accountAcRolePda = getAccountAcRoleStatePda(acRole, payer.publicKey, role);
    const existing = await fetchAccountAcRoleState(acProgram, accountAcRolePda, true);
    deployerRoles.push({ role, exists: existing !== null });
  }

  // If AC Admin has ADMIN, we can safely revoke deployer's ADMIN too
  const rolesToRevoke = deployerRoles.filter((r) => {
    if (!r.exists) return false;
    if (r.role === AC_ROLES.ADMIN && !canRevokeAdmin) return false;
    return true;
  });

  if (rolesToRevoke.length === 0) {
    const hasAdmin = deployerRoles.find((r) => r.role === AC_ROLES.ADMIN && r.exists);
    if (hasAdmin) {
      console.log('✓ Operational roles already revoked (ADMIN remains)');
      console.log('  Run token-ac:grant-admin first, then re-run to revoke ADMIN.\n');
    } else {
      console.log('✓ Deployer has no roles\n');
    }
    console.log(
      `→ Next: yarn token-ac:grant-operational --mtoken ${mtoken} --network ${network}\n`,
    );
    return;
  }

  const revokingAdmin = rolesToRevoke.some((r) => r.role === AC_ROLES.ADMIN);

  console.log(`Revoking: ${rolesToRevoke.map((r) => r.role.replace('_role', '')).join(', ')}`);
  if (!canRevokeAdmin && deployerRoles.find((r) => r.role === AC_ROLES.ADMIN && r.exists)) {
    console.log('  (ADMIN kept - AC Admin does not have ADMIN yet)\n');
  } else {
    console.log();
  }

  // ADMIN must be revoked LAST (we need it as authority for other revocations)
  const orderedRoles = rolesToRevoke.sort((a, b) => {
    if (a.role === AC_ROLES.ADMIN) return 1;
    if (b.role === AC_ROLES.ADMIN) return -1;
    return 0;
  });

  const tx = new Transaction();
  for (const roleInfo of orderedRoles) {
    tx.add(
      await acProgram.methods
        .revokeRole(acRoleToBuffer(roleInfo.role))
        .accountsPartial({
          account: payer.publicKey,
          acRole: acRole,
          authority: payer.publicKey,
          authorityAcAdminRole: deployerAdminRolePda,
          accountAcRole: getAccountAcRoleStatePda(acRole, payer.publicKey, roleInfo.role),
        })
        .instruction(),
    );
  }

  const result = await sendAndWaitForCustomSolanaTxSign(provider, tx, [], {
    action: 'deployer',
    comment: `Revoke deployer roles for ${mtoken}`,
    mToken: mtoken,
    waitForTx: false,
  });

  const txInfo = result.signature || result.txId;
  if (revokingAdmin) {
    console.log(`✓ All roles revoked (including ADMIN) | TX: ${txInfo}`);
  } else {
    console.log(`✓ Operational roles revoked | TX: ${txInfo}`);
    console.log('  (ADMIN kept - re-run after token-ac:grant-admin to revoke)');
  }

  console.log(
    `\n→ Next: yarn token-ac:grant-operational --mtoken ${mtoken} --network ${network}\n`,
  );
}

const network = getNetwork();
executeNetworkScript(network, main, 'deployer');
