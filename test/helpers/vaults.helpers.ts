import { Connection, Keypair, PublicKey, Transaction } from "@solana/web3.js";

import {
  DataFeedProgram,
  findPDA,
  toBN,
  TokenAuthorityProgram,
  VaultsProgram,
} from "./common.helpers";
import {
  DATA_FEED_PROGRAM_ID,
  DATA_FEED_SEEDS,
} from "../constants/data-feed.constants";
import { VAULTS_PROGRAM_ID, VAULTS_SEEDS } from "../constants/vaults.constants";
import { BN } from "@coral-xyz/anchor";
import keccak256 from "keccak256";

export type PaymentMint = {
  mint: PublicKey;
  feed: Keypair;
  decimals: number;
};

export const generateAcAccount = () => {
  return Keypair.generate();
};

export const generateCommonVaultAccount = () => {
  return Keypair.generate();
};

export const generateMinterVaultAccount = () => {
  return Keypair.generate();
};

export const fetchVaultCommonState = async (
  program: VaultsProgram,
  vault: PublicKey,
  allowNull = false
) => {
  try {
    return await program.account.vaultCommonState.fetchNullable(vault);
  } catch (err) {
    if (!allowNull) {
      throw new Error("Payment mint state is null");
    }
    return null;
  }
};

export const fetchVaultCommonAccountState = async (
  program: VaultsProgram,
  commonAccount: PublicKey,
  allowNull = false
) => {
  // TODO: refactor
  try {
    return await program.account.vaultCommonAccountState.fetchNullable(
      commonAccount
    );
  } catch (err) {
    if (!allowNull) {
      throw new Error("Payment mint state is null");
    }
    return null;
  }
};

export const fetchMinterVaultState = async (
  program: VaultsProgram,
  vault: PublicKey,
  allowNull = false
) => {
  try {
    return await program.account.minterVaultState.fetchNullable(vault);
  } catch (err) {
    if (!allowNull) {
      throw err;
    }
    return null;
  }
};

export const fetchRedeemerVaultState = async (
  program: VaultsProgram,
  vault: PublicKey,
  allowNull = false
) => {
  try {
    return await program.account.redeemerVaultState.fetchNullable(vault);
  } catch (err) {
    if (!allowNull) {
      throw err;
    }
    return null;
  }
};

export const fetchMinterVaultRequestState = async (
  program: VaultsProgram,
  request: PublicKey,
  allowNull = false
) => {
  try {
    return await program.account.mintVaultRequestState.fetchNullable(request);
  } catch (err) {
    if (!allowNull) {
      throw err;
    }
    return null;
  }
};

export const fetchRedeemerVaultRequestState = async (
  program: VaultsProgram,
  request: PublicKey,
  allowNull = false
) => {
  try {
    return await program.account.redeemerVaultRequestState.fetchNullable(
      request
    );
  } catch (err) {
    if (!allowNull) {
      throw err;
    }
    return null;
  }
};

export const fetchPaymentMintState = async (
  program: VaultsProgram,
  mintState: PublicKey,
  allowNull = false
) => {
  // TODO: refactor
  try {
    return await program.account.paymentMintState.fetchNullable(mintState);
  } catch (err) {
    if (!allowNull) {
      throw new Error("Payment mint state is null");
    }
    return null;
  }
};

export const fetchPauseInxState = async (
  program: VaultsProgram,
  pauseInxState: PublicKey,
  allowNull = false
) => {
  try {
    return await program.account.pauseInxState.fetchNullable(pauseInxState);
  } catch (err) {
    if (!allowNull) {
      throw new Error("Payment mint state is null");
    }
    return null;
  }
};

export const getMinterVaultPda = (commonVault: PublicKey) => {
  const [pda] = findPDA(
    [VAULTS_SEEDS.MINTER_VAULT, commonVault],
    VAULTS_PROGRAM_ID
  );
  return pda;
};

export const getRedeemerVaultPda = (commonVault: PublicKey) => {
  const [pda] = findPDA(
    [VAULTS_SEEDS.REDEEMER_VAULT, commonVault],
    VAULTS_PROGRAM_ID
  );
  return pda;
};

export const getMinterVaultRequestPda = (
  vault: PublicKey,
  request_id: bigint
) => {
  const [pda] = findPDA(
    [
      VAULTS_SEEDS.MINTER_VAULT_REQUEST,
      vault,
      new BN(request_id.toString()).toArrayLike(Buffer, "le", 8),
    ],
    VAULTS_PROGRAM_ID
  );
  return pda;
};

export const getRedeemerVaultRequestPda = (
  vault: PublicKey,
  request_id: bigint
) => {
  const [pda] = findPDA(
    [
      VAULTS_SEEDS.REDEEMER_VAULT_REQUEST,
      vault,
      new BN(request_id.toString()).toArrayLike(Buffer, "le", 8),
    ],
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

export const getVaultPda = (commonVault: PublicKey, vaultSeed: Buffer) => {
  const [pda] = findPDA([vaultSeed, commonVault], VAULTS_PROGRAM_ID);
  return pda;
};
