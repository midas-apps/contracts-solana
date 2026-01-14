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
import { getTokenAddresses } from '../../../utils/addressQueries';
import { getMtoken, getNetwork } from '../../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Wallet, network: string) {
  const mtoken = getMtoken();

  console.log(`\n━━━ Step 1/3: Grant ADMIN Role ━━━`);
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

  const deployerAdminPda = getAccountAcRoleStatePda(acRole, payer.publicKey, AC_ROLES.ADMIN);
  const deployerHasAdmin = await fetchAccountAcRoleState(acProgram, deployerAdminPda, true);

  if (!deployerHasAdmin) {
    throw createUserError('Deployer missing ADMIN role', [
      'Deployer must have ADMIN role to grant it to AC Admin',
    ]);
  }

  const acAdminRolePda = getAccountAcRoleStatePda(
    acRole,
    accessControlAdminAddress,
    AC_ROLES.ADMIN,
  );
  const acAdminHasRole = await fetchAccountAcRoleState(acProgram, acAdminRolePda, true);

  if (acAdminHasRole) {
    console.log('✓ ADMIN already granted to AC Admin');
    console.log(
      `\n→ Next: yarn token-ac:revoke-deployer --mtoken ${mtoken} --network ${network}\n`,
    );
    return;
  }

  const tx = new Transaction().add(
    await acProgram.methods
      .grantRole(acRoleToBuffer(AC_ROLES.ADMIN))
      .accountsPartial({
        account: accessControlAdminAddress,
        acRole: acRole,
        authority: payer.publicKey,
        authorityAcAdminRole: deployerAdminPda,
        accountAcRole: acAdminRolePda,
      })
      .instruction(),
  );

  const result = await sendAndWaitForCustomSolanaTxSign(provider, tx, [], {
    action: 'deployer',
    comment: `Grant ADMIN for ${mtoken}`,
    mToken: mtoken,
    waitForTx: true,
  });

  const txInfo = result.signature || result.txId;
  console.log(`✓ ADMIN granted | TX: ${txInfo}`);
  console.log(`\n→ Next: yarn token-ac:revoke-deployer --mtoken ${mtoken} --network ${network}\n`);
}

const network = getNetwork();
executeNetworkScript(network, main, 'deployer');
