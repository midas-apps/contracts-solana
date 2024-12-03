import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";

import { AccessControlProgram, findPDA } from "./common.helpers";
import { AC_PROGRAM_ID, AC_SEEDS } from "../constants/ac.constants";

export const DataFeedMode = {
  manual: { manual: {} },
  switchboard: { switchboard: {} },
};
export const generateAcAcccount = () => {
  return Keypair.generate();
};

export const generateAcRoleAcccount = () => {
  return Keypair.generate();
};

export const fetchAccountAcState = async (
  program: AccessControlProgram,
  accountAc: PublicKey,
  allowNull = false
) => {
  // TODO: refactor
  try {
    return await program.account.accountAccessControlState.fetchNullable(
      accountAc
    );
  } catch (err) {
    if (!allowNull) {
      throw new Error("Payment mint state is null");
    }
    return null;
  }
};

export const acRoleToBuffer = (role: string) => {
  return Buffer.from(role);
};

export const getAccountAcRoleStatePda = (
  acRole: PublicKey,
  account: PublicKey,
  role: string
) => {
  const [pda] = findPDA(
    [AC_SEEDS.ACCOUNT_AC_ROLE, acRole, account, acRoleToBuffer(role)],
    AC_PROGRAM_ID
  );
  return pda;
};

export const getAccountAcStatePda = (ac: PublicKey, account: PublicKey) => {
  const [pda] = findPDA([AC_SEEDS.ACCOUNT_AC, ac, account], AC_PROGRAM_ID);
  return pda;
};
