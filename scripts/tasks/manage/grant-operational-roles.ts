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

import { loadTokenConfig } from '../../configs/loadTokenConfig';
import { networkRolesConfigs } from '../../configs/network-roles';
import { ROLE_GROUPS } from '../../configs/roles-types';
import { getAcProgram } from '../../deploy/ac';
import { getTokenAddresses } from '../../utils/addressQueries';
import { getMtoken, getNetwork } from '../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Wallet, network: string) {
  const mtoken = getMtoken();
  console.log(`Grant operational roles: ${mtoken} on ${network}`);

  const networkRolesConfig = networkRolesConfigs[network];
  if (!networkRolesConfig) {
    throw createUserError(`Network roles config not found: ${network}`);
  }

  const accessControlAdminAddress = new PublicKey(networkRolesConfig.accessControlAdminAddress);

  const config = loadTokenConfig(mtoken, network);
  const grantRolesConfig = config.grantRoles;

  if (
    !grantRolesConfig ||
    !grantRolesConfig.tokenManagerAddress ||
    !grantRolesConfig.vaultsManagerAddress ||
    !grantRolesConfig.oracleManagerAddress
  ) {
    throw createUserError('Missing grantRoles config - check token config');
  }

  const tokenAddrs = getTokenAddresses(network, mtoken);
  if (!tokenAddrs?.acRole) {
    throw createUserError(`AC Role not found for ${mtoken} on ${network}`, [
      `Run: yarn deploy:token-ac-role --mtoken ${mtoken} --network ${network}`,
    ]);
  }

  const acProgram = getAcProgram(provider);
  const acRole = tokenAddrs.acRole;

  const tokenManagerAddress = new PublicKey(grantRolesConfig.tokenManagerAddress);
  const vaultsManagerAddress = new PublicKey(grantRolesConfig.vaultsManagerAddress);
  const oracleManagerAddress = new PublicKey(grantRolesConfig.oracleManagerAddress);

  const acAdminRolePda = getAccountAcRoleStatePda(
    acRole,
    accessControlAdminAddress,
    AC_ROLES.ADMIN,
  );
  const acAdminHasRole = await fetchAccountAcRoleState(acProgram, acAdminRolePda, true);

  if (!acAdminHasRole) {
    throw createUserError('AC Admin missing ADMIN role - run full 3-step process first');
  }

  console.log('Safety check passed');
  console.log(`Token Mgr:  ${tokenManagerAddress.toBase58()}`);
  console.log(`Vaults Mgr: ${vaultsManagerAddress.toBase58()}`);
  console.log(`Oracle Mgr: ${oracleManagerAddress.toBase58()}`);

  const roleGrants: { account: PublicKey; role: string; category: string }[] = [];

  for (const role of ROLE_GROUPS.TOKEN_MANAGER) {
    roleGrants.push({ account: tokenManagerAddress, role, category: 'Token Manager' });
  }
  for (const role of ROLE_GROUPS.VAULTS_MANAGER) {
    roleGrants.push({ account: vaultsManagerAddress, role, category: 'Vaults Manager' });
  }
  for (const role of ROLE_GROUPS.ORACLE_MANAGER) {
    roleGrants.push({ account: oracleManagerAddress, role, category: 'Oracle Manager' });
  }

  console.log(`Checking ${roleGrants.length} roles...`);

  const toGrant: typeof roleGrants = [];
  const alreadyGranted: typeof roleGrants = [];

  for (const grant of roleGrants) {
    const accountAcRolePda = getAccountAcRoleStatePda(acRole, grant.account, grant.role);
    const existing = await fetchAccountAcRoleState(acProgram, accountAcRolePda, true);

    if (existing !== null) {
      alreadyGranted.push(grant);
    } else {
      toGrant.push(grant);
    }
  }

  if (alreadyGranted.length > 0) {
    console.log(`Already granted: ${alreadyGranted.length}`);
  }

  if (toGrant.length === 0) {
    console.log('✓ All roles already granted\n');
    return;
  }

  console.log(`Granting ${toGrant.length} roles...`);

  const tx = new Transaction();
  for (const grant of toGrant) {
    tx.add(
      await acProgram.methods
        .grantRole(acRoleToBuffer(grant.role))
        .accountsPartial({
          account: grant.account,
          acRole: acRole,
          authority: payer.publicKey,
          authorityAcAdminRole: getAccountAcRoleStatePda(acRole, payer.publicKey, AC_ROLES.ADMIN),
          accountAcRole: getAccountAcRoleStatePda(acRole, grant.account, grant.role),
        })
        .instruction(),
    );
  }

  const result = await sendAndWaitForCustomSolanaTxSign(provider, network, tx, [], {
    action: 'update-ac',
    comment: `Grant operational ${mtoken} roles`,
    mToken: mtoken,
    waitForTx: true,
    pollingIntervalMs: 1000,
    timeoutDurationMs: 120 * 1000,
  });

  console.log('✓ All operational roles granted');
  if (result.signature) console.log(`TX: ${result.signature}`);
  else if (result.txId) console.log(`Fordefi TX: ${result.txId}`);

  console.log('✓ Role transfer complete - deployer has no roles\n');
}

const network = getNetwork();
executeNetworkScript(network, main, 'update-ac');
