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
import keccak256 from "keccak256";

export type PaymentMint = {
  mint: PublicKey;
  feed: Keypair;
  decimals: number;
};

export const generateAcAcccount = () => {
  return Keypair.generate();
};

export const generateCommonVaultAccount = () => {
  return Keypair.generate();
};

export const generateMinterVaultAccount = () => {
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

export const fetchMintAuthorityState = async (
  program: VaultsProgram,
  mintAuthority: PublicKey,
  allowNull = false
) => {
  // TODO: refactor
  try {
    return await program.account.mintAuthorityState.fetchNullable(
      mintAuthority
    );
  } catch (err) {
    if (!allowNull) {
      throw new Error("Payment mint state is null");
    }
    return null;
  }
};

export const fetchMinterVaultState = (
  program: VaultsProgram,
  vault: PublicKey
) => {
  return program.account.minterVaultState.fetchNullable(vault);
};

export const fetchRedeemerVaultState = (
  program: VaultsProgram,
  vault: PublicKey
) => {
  return program.account.redeemerVaultState.fetchNullable(vault);
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

export const fetchPauseInxState = (
  program: VaultsProgram,
  pauseInxState: PublicKey
) => {
  return program.account.pauseInxState.fetchNullable(pauseInxState);
};

export const fetchAccountAcState = async (
  program: VaultsProgram,
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

export const mintAuthoritySeedToBuffer = (seed: string) => {
  return keccak256(Buffer.from(seed));
};

export const getMintAuthorityPda = (seed: string | Buffer) => {
  const buff =
    seed instanceof Buffer ? seed : mintAuthoritySeedToBuffer(seed as string);

  const [pda] = findPDA([VAULTS_SEEDS.MINT_AUTHORITY, buff], VAULTS_PROGRAM_ID);
  return pda;
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
