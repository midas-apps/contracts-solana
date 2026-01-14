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

import { loadTokenConfig } from '../../../configs/loadTokenConfig';
import { networkRolesConfigs } from '../../../configs/network-roles';
import { ROLE_GROUPS } from '../../../configs/roles-types';
import { getAcProgram } from '../../../deploy/ac';
import { getTokenAddresses } from '../../../utils/addressQueries';
import { getMtoken, getNetwork } from '../../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Wallet, network: string) {
  const mtoken = getMtoken();

  console.log(`\n━━━ Step 3/3: Grant Operational Roles ━━━`);
  console.log(`Token: ${mtoken} | Network: ${network}\n`);

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

  console.log(`Authority: ${payer.publicKey.toString()}`);
  console.log(`Expected:  ${accessControlAdminAddress.toString()}\n`);

  // Verify current wallet has ADMIN role
  const payerAdminRolePda = getAccountAcRoleStatePda(acRole, payer.publicKey, AC_ROLES.ADMIN);
  const payerHasAdmin = await fetchAccountAcRoleState(acProgram, payerAdminRolePda, true);

  if (!payerHasAdmin) {
    throw createUserError('Current wallet missing ADMIN role', [
      'Run the full 3-step process:',
      `1. yarn token-ac:grant-admin --mtoken ${mtoken} --network ${network}`,
      `2. yarn token-ac:revoke-deployer --mtoken ${mtoken} --network ${network}`,
      `3. yarn token-ac:grant-operational --mtoken ${mtoken} --network ${network}`,
    ]);
  }

  console.log('Recipients:');
  console.log(`  Token Manager:  ${tokenManagerAddress.toString()}`);
  console.log(`  Vaults Manager: ${vaultsManagerAddress.toString()}`);
  console.log(`  Oracle Manager: ${oracleManagerAddress.toString()}\n`);

  const roleGrants: { account: PublicKey; role: string; category: string }[] = [];

  for (const role of ROLE_GROUPS.TOKEN_MANAGER) {
    roleGrants.push({ account: tokenManagerAddress, role, category: 'Token' });
  }
  for (const role of ROLE_GROUPS.VAULTS_MANAGER) {
    roleGrants.push({ account: vaultsManagerAddress, role, category: 'Vaults' });
  }
  for (const role of ROLE_GROUPS.ORACLE_MANAGER) {
    roleGrants.push({ account: oracleManagerAddress, role, category: 'Oracle' });
  }

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

  if (toGrant.length === 0) {
    console.log(`✓ All ${roleGrants.length} roles already granted`);
    console.log('\n✅ Role transfer complete!\n');
    return;
  }

  if (alreadyGranted.length > 0) {
    console.log(`Already granted: ${alreadyGranted.length}/${roleGrants.length}`);
  }

  console.log(`Granting: ${toGrant.map((r) => r.role.replace('_role', '')).join(', ')}\n`);

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

  const result = await sendAndWaitForCustomSolanaTxSign(provider, tx, [], {
    action: 'update-ac',
    comment: `Grant operational ${mtoken} roles`,
    mToken: mtoken,
    waitForTx: false,
  });

  if (result.signature) {
    // Local wallet or auto-approved - transaction already mined
    console.log(`✓ ${toGrant.length} roles granted | TX: ${result.signature}`);
    console.log('\n✅ Role transfer complete!\n');
  } else {
    // Fordefi multi-sig - transaction pending approval
    console.log(`✓ Transaction created | Fordefi TX ID: ${result.txId}`);
    console.log(`\n⏳ Awaiting approval in Fordefi dashboard`);
    console.log(`   This transaction requires multi-sig approval before mining.\n`);
  }
}

const network = getNetwork();
executeNetworkScript(network, main, 'update-ac');
