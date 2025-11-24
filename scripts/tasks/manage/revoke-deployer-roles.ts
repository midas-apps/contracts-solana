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

import { networkRolesConfigs } from '../../configs/network-roles';
import { DEPLOYER_AUTO_ROLES } from '../../configs/roles-types';
import { getAcProgram } from '../../deploy/ac';
import { getTokenAddresses } from '../../utils/addressQueries';
import { getMtoken, getNetwork } from '../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Wallet, network: string) {
  const mtoken = getMtoken();
  console.log(`Revoke deployer roles: ${mtoken} on ${network}`);

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

  const acAdminRolePda = getAccountAcRoleStatePda(
    acRole,
    accessControlAdminAddress,
    AC_ROLES.ADMIN,
  );
  const acAdminHasRole = await fetchAccountAcRoleState(acProgram, acAdminRolePda, true);

  if (!acAdminHasRole) {
    throw createUserError('AC Admin missing ADMIN role - run grant:admin-role first');
  }

  console.log('Safety check passed');

  const deployerRoles: { role: string; exists: boolean }[] = [];
  for (const role of DEPLOYER_AUTO_ROLES) {
    const accountAcRolePda = getAccountAcRoleStatePda(acRole, payer.publicKey, role);
    const existing = await fetchAccountAcRoleState(acProgram, accountAcRolePda, true);
    deployerRoles.push({ role, exists: existing !== null });
  }

  const rolesToRevoke = deployerRoles.filter((r) => r.exists);

  if (rolesToRevoke.length === 0) {
    console.log('✓ Deployer already has no roles');
    console.log(`→ Next: yarn grant:operational-roles --mtoken ${mtoken} --network ${network}\n`);
    return;
  }

  console.log(
    `Revoking ${rolesToRevoke.length} roles: ${rolesToRevoke.map((r) => r.role).join(', ')}`,
  );

  const tx = new Transaction();
  for (const roleInfo of rolesToRevoke) {
    tx.add(
      await acProgram.methods
        .revokeRole(acRoleToBuffer(roleInfo.role))
        .accountsPartial({
          account: payer.publicKey,
          acRole: acRole,
          authority: payer.publicKey,
          authorityAcAdminRole: getAccountAcRoleStatePda(acRole, payer.publicKey, AC_ROLES.ADMIN),
          accountAcRole: getAccountAcRoleStatePda(acRole, payer.publicKey, roleInfo.role),
        })
        .instruction(),
    );
  }

  const result = await sendAndWaitForCustomSolanaTxSign(provider, network, tx, [], {
    action: 'deployer',
    comment: `Revoke all deployer roles for ${mtoken}`,
    mToken: mtoken,
    waitForTx: true,
    pollingIntervalMs: 1000,
    timeoutDurationMs: 120 * 1000,
  });

  console.log('✓ All deployer roles revoked');
  if (result.signature) console.log(`TX: ${result.signature}`);
  else if (result.txId) console.log(`Fordefi TX: ${result.txId}`);

  console.log(`→ Next: yarn grant:operational-roles --mtoken ${mtoken} --network ${network}\n`);
}

const network = getNetwork();
executeNetworkScript(network, main, 'deployer');
