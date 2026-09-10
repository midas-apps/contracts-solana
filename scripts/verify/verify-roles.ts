import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

import { createUserError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';
import { fetchAccountAcRoleState, getAccountAcRoleStatePda } from '@/test/helpers/ac.helpers';

import { SOLANA_ROLES } from '../configs/roles-types';
import { getAcProgram } from '../deploy/ac';
import { getTokenAddresses } from '../utils/addressQueries';
import { getMtoken, getNetwork, getOptionalArg } from '../utils/argumentParser';

// All possible roles in the system
const ALL_ROLES = [
  SOLANA_ROLES.ADMIN,
  SOLANA_ROLES.UPDATE_ACCOUNT_AC,
  SOLANA_ROLES.VAULT_ADMIN,
  SOLANA_ROLES.VAULT_PAUSER,
  SOLANA_ROLES.M_MINTER,
  SOLANA_ROLES.M_BURNER,
  SOLANA_ROLES.M_FREEZER,
  SOLANA_ROLES.FEED_ADMIN,
];

async function main(provider: AnchorProvider, payer: Wallet, network: string) {
  const mtoken = getMtoken();
  const addressArg = getOptionalArg('address');

  // Default to current payer if no address specified
  const targetAddress = addressArg ? new PublicKey(addressArg) : payer.publicKey;

  console.log(`\n━━━ Verify Roles: ${mtoken} on ${network} ━━━\n`);
  console.log('👤 Target Address:', targetAddress.toString());

  const tokenAddrs = getTokenAddresses(network, mtoken);
  if (!tokenAddrs?.acRole) {
    throw createUserError(`AC Role not found for ${mtoken} on ${network}`, [
      `Run: yarn deploy:token-ac-role --mtoken ${mtoken} --network ${network}`,
    ]);
  }

  const acProgram = getAcProgram(provider);
  const acRole = tokenAddrs.acRole;

  console.log('\n🔍 Checking roles...\n');

  const rolesStatus: { role: string; hasRole: boolean; pda?: PublicKey }[] = [];

  for (const role of ALL_ROLES) {
    const accountAcRolePda = getAccountAcRoleStatePda(acRole, targetAddress, role);
    const roleState = await fetchAccountAcRoleState(acProgram, accountAcRolePda, true);

    rolesStatus.push({
      role,
      hasRole: roleState !== null,
      pda: accountAcRolePda,
    });
  }

  const hasRoles = rolesStatus.filter((r) => r.hasRole);
  const noRoles = rolesStatus.filter((r) => !r.hasRole);

  if (hasRoles.length === 0) {
    console.log('❌ Address has NO roles\n');
    return;
  }

  console.log(`✅ Address has ${hasRoles.length} role(s):\n`);
  hasRoles.forEach((r) => {
    console.log(`   ✓ ${r.role}`);
  });

  if (noRoles.length > 0) {
    console.log(`\n❌ Address does NOT have ${noRoles.length} role(s):\n`);
    noRoles.forEach((r) => {
      console.log(`   ✗ ${r.role}`);
    });
  }

  console.log();
}

const network = getNetwork();
executeNetworkScript(network, main, 'deployer');

// Usage:
// yarn tsx scripts/verify/verify-roles.ts --network localnet --mtoken mTBILL
// yarn tsx scripts/verify/verify-roles.ts --network localnet --mtoken mTBILL --address <PUBKEY>
