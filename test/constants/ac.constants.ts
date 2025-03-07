import { PublicKey } from "@solana/web3.js";

export const AC_PROGRAM_ID = new PublicKey(
  "GQp4fJwxmLF7vL7uJ4jpS3uRz96qrb7MfoLKMnJoeE3Z"
);

export const AC_SEEDS = {
  ACCOUNT_AC: "account_ac",
  ACCOUNT_AC_ROLE: "account_ac_role",
};

export const AC_ROLES = {
  ADMIN: "admin_role",
  UPDATE_ACCOUNT_AC: "update_account_ac_role",
};

export enum AcError {
  NotAuthority = 6000,
  BothBlacklistedAndWhitelisted,
}
