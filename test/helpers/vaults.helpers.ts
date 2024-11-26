import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";

import {
  DataFeedProgram,
  findPDA,
  toBN,
  VaultsProgram,
} from "./common.helpers";
import {
  DATA_FEED_PROGRAM_ID,
  DATA_FEED_SEEDS,
} from "../constants/data-feed.constants";
import { VAULTS_PROGRAM_ID, VAULTS_SEEDS } from "../constants/vaults.constants";
import { BN } from "@coral-xyz/anchor";

export const generateAcAcccount = () => {
  return Keypair.generate();
};

export const fetchAcState = (program: VaultsProgram, ac: PublicKey) => {
  return program.account.accessControlState.fetchNullable(ac);
};

export const fetchVaultCommonState = (
  program: VaultsProgram,
  vault: PublicKey
) => {
  return program.account.vaultCommonState.fetchNullable(vault);
};

export const fetchVaultCommonAccountState = (
  program: VaultsProgram,
  commonAccount: PublicKey
) => {
  return program.account.vaultCommonAccountState.fetchNullable(commonAccount);
};

export const fetchMinterVaultState = (
  program: VaultsProgram,
  vault: PublicKey
) => {
  return program.account.minterVaultState.fetchNullable(vault);
};

export const fetchPaymentMintState = (
  program: VaultsProgram,
  mintState: PublicKey
) => {
  return program.account.paymentMintState.fetchNullable(mintState);
};

export const fetchPauseInxState = (
  program: VaultsProgram,
  pauseInxState: PublicKey
) => {
  return program.account.pauseInxState.fetchNullable(pauseInxState);
};

export const fetchAccountAcState = (
  program: VaultsProgram,
  accountAc: PublicKey
) => {
  return program.account.accountAccessControlState.fetchNullable(accountAc);
};

export const getAccountAcStatePda = (ac: PublicKey, account: PublicKey) => {
  const [pda] = findPDA(
    [VAULTS_SEEDS.ACCOUNT_AC, ac, account],
    VAULTS_PROGRAM_ID
  );
  return pda;
};

export const getPauseInxStatePda = (commonVault: PublicKey, inxId: number) => {
  const [pda] = findPDA(
    [VAULTS_SEEDS.PAUSE_INX, commonVault, toBN(inxId).toBuffer("le")],
    VAULTS_PROGRAM_ID
  );
  return pda;
};

export const getPaymentMintStatePda = (
  commonVault: PublicKey,
  mint: PublicKey
) => {
  const [pda] = findPDA(
    [VAULTS_SEEDS.PAYMENT_MINT, commonVault, mint],
    VAULTS_PROGRAM_ID
  );
  return pda;
};

export const getCommonVaultAccountStatePda = (
  commonVault: PublicKey,
  account: PublicKey
) => {
  const [pda] = findPDA(
    [VAULTS_SEEDS.VAULT_COMMON_ACCOUNT, commonVault, account],
    VAULTS_PROGRAM_ID
  );
  return pda;
};
