import { AnchorProvider, Program } from '@coral-xyz/anchor';
import {
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from '@solana/web3.js';
import * as AC_IDL from '../../../target/idl/access_control.json';
import { CommonParams } from './common';
import {
  acRoleToBuffer,
  getAccountAcRoleStatePda,
} from '../../../test/helpers/ac.helpers';
import { AC_ROLES } from '../../../test/constants/ac.constants';
import { AccessControl } from '../../../target/types/access_control';
import { getAddresses } from '@/common/addresses';
import { MTokenName } from '@/common/types/tokens';
import { VAULT_AC_ROLES } from '@/test/constants/vaults.constants';

export const getAcProgram = (provider: AnchorProvider) => {
  return new Program<AccessControl>(AC_IDL as any, provider);
};

export type DeployAcConfig = {
  acRole: PublicKey;
  ac?: Keypair;
};

export type DeployAcRoleConfig = {
  acRole?: Keypair;
};

export const deployAc = async (common: CommonParams) => {
  const addresses = getAddresses(common.provider.network);
  const { acRoleGlobal: acRole } = addresses;

  const ac = Keypair.generate();

  const acProgram = getAcProgram(common.provider);

  const tx = await acProgram.methods
    .newAc()
    .accountsPartial({
      acRole: acRole,
      ac: ac.publicKey,
      payer: common.payer.publicKey,
    })
    .transaction();

  const txRes = await sendAndConfirmTransaction(
    common.provider.connection,
    tx,
    [common.payer, ac],
    {
      commitment: 'finalized',
    },
  );

  console.log({
    txRes,
    ac: ac.publicKey,
  });

  return ac.publicKey;
};

export const deployAcRole = async (common: CommonParams) => {
  const acRole = Keypair.generate();

  const acProgram = getAcProgram(common.provider);

  const tx = await acProgram.methods
    .newAcRole()
    .accountsPartial({
      acRole: acRole.publicKey,
      authority: common.payer.publicKey,
      accountAcRole: getAccountAcRoleStatePda(
        acRole.publicKey,
        common.payer.publicKey,
        AC_ROLES.ADMIN,
      ),
    })
    .transaction();

  const txRes = await sendAndConfirmTransaction(
    common.provider.connection,
    tx,
    [common.payer, acRole],
    {
      commitment: 'finalized',
    },
  );

  console.log({
    txRes,
    acRole: acRole.publicKey,
  });

  return acRole.publicKey;
};

export const grantRole = async (
  { provider, payer }: CommonParams,
  mToken: MTokenName,
) => {
  const acProgram = getAcProgram(provider);

  const addresses = getAddresses(provider.network);
  const acRoles = addresses[mToken].acRole;

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
};
