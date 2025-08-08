import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, sendAndConfirmTransaction } from "@solana/web3.js";
import * as AC_IDL from "../../../target/idl/access_control.json";
import { getAccountAcRoleStatePda } from "../../../test/helpers/ac.helpers";
import { AC_ROLES } from "../../../test/constants/ac.constants";
import { AccessControl } from "../../../target/types/access_control";
import { CommonParams } from "@/common/utils";
import { addresses } from "@/common/addresses";

export const getAcProgram = (provider: AnchorProvider) => {
  return new Program<AccessControl>(AC_IDL as any, provider);
};

export type DeployAcGlobalConfig = {};

export type DeployAcRoleGlobalConfig = {};

type DeployAcInternalConfig = {
  acRole: PublicKey;
  ac?: Keypair;
};

type DeployAcRoleInternalConfig = {
  acRole?: Keypair;
};

export const deployAcGlobal = async (
  common: CommonParams,
  _config: DeployAcGlobalConfig
) => {
  const networkAddresses = addresses[common.cluster];

  return deployAc(common, { acRole: networkAddresses.acRoleGlobal });
};

export const deployAcRoleGlobal = async (
  common: CommonParams,
  _config: DeployAcRoleGlobalConfig
) => {
  return deployAcRole(common, {});
};

const deployAc = async (
  common: CommonParams,
  { acRole, ac }: DeployAcInternalConfig
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

  const txRes = await sendAndConfirmTransaction(
    common.provider.connection,
    tx,
    [common.payer, ac],
    {
      commitment: "finalized",
    }
  );

  console.log({
    txRes,
    ac: ac.publicKey,
  });

  return ac.publicKey;
};

const deployAcRole = async (
  common: CommonParams,
  { acRole }: DeployAcRoleInternalConfig
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
        AC_ROLES.ADMIN
      ),
    })
    .transaction();

  const txRes = await sendAndConfirmTransaction(
    common.provider.connection,
    tx,
    [common.payer, acRole],
    {
      commitment: "finalized",
    }
  );

  console.log({
    txRes,
    acRole: acRole.publicKey,
  });

  return acRole.publicKey;
};
