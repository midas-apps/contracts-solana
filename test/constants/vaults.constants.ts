import { PublicKey } from '@solana/web3.js';

import MIDAS_VAULTS_IDL from '../../target/idl/midas_vaults.json' with { type: 'json' };

export const VAULTS_PROGRAM_ID = new PublicKey(MIDAS_VAULTS_IDL.address);

export enum VaultActionIds {
  MINT_INSTANT = 0,
  MINT_REQUEST,
  REDEEM_INSTANT,
  REDEEM_REQUEST,
  REDEEM_REQUEST_FIAT,
}

export const VAULTS_SEEDS = {
  ACCOUNT_AC: 'account_ac',
  MINTER_VAULT_REQUEST: 'mint_vault_request',
  REDEEMER_VAULT_REQUEST: 'redeemer_vault_request',
  PAUSE_INX: 'pause_inx_state',
  PAYMENT_MINT: 'payment_mint',
  VAULT_COMMON_ACCOUNT: 'vault_account_state',
  MINTER_VAULT: 'minter_vault',
  REDEEMER_VAULT: 'redeemer_vault',
};

export const VAULT_AC_ROLES = {
  VAULT_ADMIN: 'vault_admin_role',
  VAULT_PAUSER: 'vault_pauser_role',
  REQUEST_MANAGER: 'request_manager_role',
};

export enum VaultError {
  NotAuthority = 6000,
  NotGreenListed,
  Blacklisted,
  VaultPaused,
  VaultInxPaused,
  LessThanMinAmount,
  LessThanMinAmountFirstMint,
  InsufficientAllowance,
  DailyLimitExceeded,
  VariationToleranceExceeded,
  InvalidFee,
  InvalidInAmount,
  InvalidOutAmount,
  InvalidConvertAmount,
  InvalidRate,
  LessThanMinReceiveAmount,
  InvalidPaymentMint,
  InvalidSeedProvided,
  InvalidVaultProvided,
  ValueDidtnChange,
  MaxSupplyCapExceeded,
}
