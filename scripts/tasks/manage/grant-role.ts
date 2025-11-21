import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { Transaction } from '@solana/web3.js';

import { createUserError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';
import { AC_ROLES } from '@/test/constants/ac.constants';
import {
  acRoleToBuffer,
  getAccountAcRoleStatePda,
  fetchAccountAcRoleState,
} from '@/test/helpers/ac.helpers';

import { getAcProgram } from '../../deploy/ac';
import { getTokenAddresses } from '../../utils/addressQueries';
import { getMtoken, getNetwork, getRole } from '../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Wallet) {
  const mtoken = getMtoken();
  const network = getNetwork();
  const role = getRole();

  console.log(`Granting role: ${role} for token: ${mtoken}`);

  // Get token addresses
  const tokenAddrs = getTokenAddresses(network, mtoken);
  if (!tokenAddrs?.acRole) {
    throw createUserError(`AC Role not found for ${mtoken} on ${network}`, [
      `Run: yarn deploy:token-core --mtoken ${mtoken} --network ${network}`,
    ]);
  }

  const acProgram = getAcProgram(provider);
  const acRoles = tokenAddrs.acRole;

  // Check if the role is already granted
  const accountAcRolePda = getAccountAcRoleStatePda(acRoles, payer.publicKey, role);
  const existingRoleState = await fetchAccountAcRoleState(acProgram, accountAcRolePda, true);

  if (existingRoleState !== null) {
    console.log(`⚠️  Role ${role} is already granted to ${payer.publicKey.toString()}`);
    console.log(`Skipping grant operation.`);
    return;
  }

  const tx = new Transaction().add(
    await acProgram.methods
      .grantRole(acRoleToBuffer(role))
      .accountsPartial({
        account: payer.publicKey,
        acRole: acRoles,
        authority: payer.publicKey,
        authorityAcAdminRole: getAccountAcRoleStatePda(acRoles, payer.publicKey, AC_ROLES.ADMIN),
        accountAcRole: getAccountAcRoleStatePda(acRoles, payer.publicKey, role),
      })
      .instruction(),
  );

  const txRes = await provider.sendAndConfirm(tx, [], {
    commitment: 'finalized',
  });

  console.log(`✅ Role ${role} granted successfully`);
  console.log(`Transaction: ${txRes}`);
}

const network = getNetwork();
executeNetworkScript(network, main, 'update-ac');
