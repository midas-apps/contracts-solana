import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';

import { addresses } from '@/common/addresses';
import { MProduct } from '@/common/tokenTypes';
import { AC_ROLES } from '@/test/constants/ac.constants';
import { VAULT_AC_ROLES } from '@/test/constants/vaults.constants';
import { acRoleToBuffer, getAccountAcRoleStatePda } from '@/test/helpers/ac.helpers';

import { executeAnchorScript } from '../common/utils';

import { getAcProgram } from './deploy/contracts/ac';

async function main(provider: AnchorProvider, payer: Keypair) {
  const acProgram = getAcProgram(provider);

  const acRoles = addresses['devnet'].tokens[MProduct.MTBILL].acRole;

  const tx = new Transaction().add(
    await acProgram.methods
      .grantRole(acRoleToBuffer(VAULT_AC_ROLES.VAULT_PAUSER))
      .accountsPartial({
        account: payer.publicKey,
        acRole: acRoles,
        authority: payer.publicKey,
        authorityAcAdminRole: getAccountAcRoleStatePda(acRoles, payer.publicKey, AC_ROLES.ADMIN),
        accountAcRole: getAccountAcRoleStatePda(
          acRoles,
          payer.publicKey,
          VAULT_AC_ROLES.VAULT_PAUSER,
        ),
      })
      .instruction(),
  );

  const txRes = await sendAndConfirmTransaction(provider.connection, tx, [payer], {
    commitment: 'finalized',
  });

  console.log({ txRes });
}

executeAnchorScript(main);
