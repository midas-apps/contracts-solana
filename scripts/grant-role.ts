import {
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from '@solana/web3.js';
import { AnchorProvider } from '@coral-xyz/anchor';

import { executeAnchorScript } from '../common/utils';
import {
  acRoleToBuffer,
  getAccountAcRoleStatePda,
} from '@/test/helpers/ac.helpers';
import { VAULT_AC_ROLES } from '@/test/constants/vaults.constants';
import { addresses } from '@/common/addresses';
import { getAcProgram } from './deploy/common/ac';
import { AC_ROLES } from '@/test/constants/ac.constants';

async function main(provider: AnchorProvider, payer: Keypair) {
  const acProgram = getAcProgram(provider);

  const acRoles = addresses['devnet'].mTBILL.acRole;

  const tx = new Transaction().add(
    await acProgram.methods
      .grantRole(acRoleToBuffer(VAULT_AC_ROLES.VAULT_PAUSER))
      .accountsPartial({
        account: payer.publicKey,
        acRole: acRoles,
        authority: payer.publicKey,
        authorityAcAdminRole: getAccountAcRoleStatePda(
          acRoles,
          payer.publicKey,
          AC_ROLES.ADMIN,
        ),
        accountAcRole: getAccountAcRoleStatePda(
          acRoles,
          payer.publicKey,
          VAULT_AC_ROLES.VAULT_PAUSER,
        ),
      })
      .instruction(),
  );

  const txRes = await sendAndConfirmTransaction(
    provider.connection,
    tx,
    [payer],
    {
      commitment: 'finalized',
    },
  );

  console.log({ txRes });
}

executeAnchorScript(main);
