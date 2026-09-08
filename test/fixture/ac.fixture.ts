import { Program } from '@coral-xyz/anchor';
import { Transaction } from '@solana/web3.js';

import { AccessControl } from 'target/types/access_control';

import ACCESS_CONTROL_IDL from '../../target/idl/access_control.json' with { type: 'json' };
import { AC_ROLES } from '../constants/ac.constants';
import { acRoleToBuffer, generateAcRoleAccount } from '../helpers/ac.helpers';
import { initLiteSVM, InitLiteSVMReturnType, processTransaction } from '../helpers/common.helpers';
import { generateAcAccount } from '../helpers/vaults.helpers';

export const acFixture = async (fixture?: InitLiteSVMReturnType, initSlot?: bigint) => {
  const { provider, context, accounts } = fixture ?? (await initLiteSVM(10, initSlot));
  const [authority, ...regularAccounts] = accounts;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const acProgram = new Program<AccessControl>(ACCESS_CONTROL_IDL as any, provider);

  const ac = generateAcAccount();

  const acRoleGlobal = generateAcRoleAccount();
  const acRoleMTbill = generateAcRoleAccount();

  const createFeedTx = new Transaction().add(
    await acProgram.methods
      .newAcRole()
      .accounts({
        acRole: acRoleGlobal.publicKey,
        authority: authority.publicKey,
      })
      .instruction(),
    await acProgram.methods
      .newAcRole()
      .accounts({
        acRole: acRoleMTbill.publicKey,
        authority: authority.publicKey,
      })
      .instruction(),
    await acProgram.methods
      .newAc()
      .accounts({
        acRole: acRoleGlobal.publicKey,
        ac: ac.publicKey,
        payer: authority.publicKey,
      })
      .instruction(),
    await acProgram.methods
      .grantRole(acRoleToBuffer(AC_ROLES.UPDATE_ACCOUNT_AC))
      .accounts({
        acRole: acRoleGlobal.publicKey,
        authority: authority.publicKey,
        account: authority.publicKey,
      })
      .instruction(),
  );

  await processTransaction(context, createFeedTx, [authority, acRoleGlobal, acRoleMTbill, ac]);

  return {
    acProgram,
    provider,
    accounts,
    authority,
    regularAccounts,
    context,
    ac,
    acRoleGlobal,
    acRoleMTbill,
  };
};

export type AccessControlFixtureReturnType = Awaited<ReturnType<typeof acFixture>>;
