import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';

import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';

import AC_IDL from '../../target/idl/access_control.json' with { type: 'json' };
import { AccessControl } from '../../target/types/access_control';
import { AC_ROLES } from '../../test/constants/ac.constants';
import { getAccountAcRoleStatePda } from '../../test/helpers/ac.helpers';

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

export const deployAc = async (common: CommonParams, { acRole, ac }: DeployAcConfig) => {
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

  await sendAndWaitForCustomSolanaTxSign(common.provider, common.network, tx, [ac], {
    action: 'deployer',
    comment: 'Deploy Access Control',
    waitForTx: true,
    pollingIntervalMs: 1000,
    timeoutDurationMs: 120 * 1000,
  });

  return ac.publicKey;
};

export const deployAcRole = async (common: CommonParams, { acRole }: DeployAcRoleConfig) => {
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

  await sendAndWaitForCustomSolanaTxSign(common.provider, common.network, tx, [acRole], {
    action: 'deployer',
    comment: 'Deploy AC Role',
    waitForTx: true,
    pollingIntervalMs: 1000,
    timeoutDurationMs: 120 * 1000,
  });

  return acRole.publicKey;
};
