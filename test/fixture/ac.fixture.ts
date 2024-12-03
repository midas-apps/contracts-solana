import { initBankrun, processTransaction } from "../helpers/common.helpers";

import { Program } from "@coral-xyz/anchor";

import * as ACCESS_CONTROL_IDL from "../../target/idl/access_control.json";

import { AccessControl } from "@/target/types/access_control";
import { Transaction } from "@solana/web3.js";
import { acRoleToBuffer, generateAcRoleAccount } from "../helpers/ac.helpers";
import { generateAcAccount } from "../helpers/vaults.helpers";
import { AC_ROLES } from "../constants/ac.constants";

export const acFixture = async () => {
  const { provider, context, accounts } = await initBankrun();
  const [authority, ...regularAccounts] = accounts;

  const acProgram = new Program<AccessControl>(
    ACCESS_CONTROL_IDL as any,
    provider
  );

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
      .instruction()
  );

  await processTransaction(context, createFeedTx, [
    authority,
    acRoleGlobal,
    acRoleMTbill,
    ac,
  ]);

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

export type AccessControlFixtureReturnType = Awaited<
  ReturnType<typeof acFixture>
>;
