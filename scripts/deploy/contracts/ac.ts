import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey, sendAndConfirmTransaction } from '@solana/web3.js';

import AC_IDL from '../../../target/idl/access_control.json' with { type: 'json' };
import { AccessControl } from '../../../target/types/access_control';
import { AC_ROLES } from '../../../test/constants/ac.constants';
import { getAccountAcRoleStatePda } from '../../../test/helpers/ac.helpers';

import { CommonParams } from './dataFeed';

export const getAcProgram = (provider: AnchorProvider) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Program<AccessControl>(AC_IDL as any, provider);
};

export interface DeployAcConfig {
  acRole: PublicKey;
  ac?: Keypair;
}

export interface DeployAcRoleConfig {
  acRole?: Keypair;
}

export const deployAc = async (
  common: CommonParams & { network?: string },
  { acRole, ac }: DeployAcConfig,
) => {
  ac ??= Keypair.generate();

  const acProgram = getAcProgram(common.provider);

  const tx = await acProgram.methods
    .newAc()
    .accountsPartial({
      acRole: acRole,
      ac: ac.publicKey,
      payer: common.payer.publicKey,
    })
    .transaction();

  await sendAndConfirmTransaction(common.provider.connection, tx, [common.payer, ac], {
    commitment: 'finalized',
  });

  return ac.publicKey;
};

export const deployAcRole = async (
  common: CommonParams & { network?: string },
  { acRole }: DeployAcRoleConfig,
) => {
  acRole ??= Keypair.generate();

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

  await sendAndConfirmTransaction(common.provider.connection, tx, [common.payer, acRole], {
    commitment: 'finalized',
  });

  return acRole.publicKey;
};
