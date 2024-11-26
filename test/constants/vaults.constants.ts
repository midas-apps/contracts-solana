import { PublicKey } from "@solana/web3.js";

export const VAULTS_PROGRAM_ID = new PublicKey(
  "6eFgYZCZZFTe61T4YxWsiHHAunCLTh9V7TAjj8DxuZwm"
);

export const VAULTS_SEEDS = {
  ACCOUNT_AC: "account_ac",
  MINTER_VAULT_REQUEST: "mint_vault_request",
  PAUSE_INX: "pause_inx_state",
  PAYMENT_MINT: "payment_mint",
  VAULT_COMMON_ACCOUNT: "vault_account_state",
};
