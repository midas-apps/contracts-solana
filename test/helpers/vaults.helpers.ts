import { Keypair, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

import { VAULTS_PROGRAM_ID, VAULTS_SEEDS } from '../constants/vaults.constants';

import { fetchAccountNullable, findPDA, toBN, VaultsProgram } from './common.helpers';

export interface PaymentMint {
  mint: PublicKey;
  feed: Keypair;
  decimals: number;
}

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
  allowNull = false,
) => {
  return fetchAccountNullable(vault, program.account.vaultCommonState, allowNull);
};

export const fetchVaultCommonAccountState = async (
  program: VaultsProgram,
  commonAccount: PublicKey,
  allowNull = false,
) => {
  return fetchAccountNullable(commonAccount, program.account.vaultCommonAccountState, allowNull);
};

export const fetchMinterVaultState = async (
  program: VaultsProgram,
  vault: PublicKey,
  allowNull = false,
) => {
  return fetchAccountNullable(vault, program.account.minterVaultState, allowNull);
};

export const fetchRedeemerVaultState = async (
  program: VaultsProgram,
  vault: PublicKey,
  allowNull = false,
) => {
  return fetchAccountNullable(vault, program.account.redeemerVaultState, allowNull);
};

export const fetchMinterVaultRequestState = async (
  program: VaultsProgram,
  request: PublicKey,
  allowNull = false,
) => {
  return fetchAccountNullable(request, program.account.mintVaultRequestState, allowNull);
};

export const fetchRedeemerVaultRequestState = async (
  program: VaultsProgram,
  request: PublicKey,
  allowNull = false,
) => {
  return fetchAccountNullable(request, program.account.redeemerVaultRequestState, allowNull);
};

export const fetchPaymentMintState = async (
  program: VaultsProgram,
  mintState: PublicKey,
  allowNull = false,
) => {
  return fetchAccountNullable(mintState, program.account.paymentMintState, allowNull);
};

export const fetchPauseInxState = async (
  program: VaultsProgram,
  pauseInxState: PublicKey,
  allowNull = false,
) => {
  return fetchAccountNullable(pauseInxState, program.account.pauseInxState, allowNull);
};

export const getMinterVaultPda = (commonVault: PublicKey) => {
  const [pda] = findPDA([VAULTS_SEEDS.MINTER_VAULT, commonVault], VAULTS_PROGRAM_ID);
  return pda;
};

export const getRedeemerVaultPda = (commonVault: PublicKey) => {
  const [pda] = findPDA([VAULTS_SEEDS.REDEEMER_VAULT, commonVault], VAULTS_PROGRAM_ID);
  return pda;
};

export const getMinterVaultRequestPda = (vault: PublicKey, request_id: bigint) => {
  const [pda] = findPDA(
    [
      VAULTS_SEEDS.MINTER_VAULT_REQUEST,
      vault,
      new BN(request_id.toString()).toArrayLike(Buffer, 'le', 8),
    ],
    VAULTS_PROGRAM_ID,
  );
  return pda;
};

export const getRedeemerVaultRequestPda = (vault: PublicKey, request_id: bigint) => {
  const [pda] = findPDA(
    [
      VAULTS_SEEDS.REDEEMER_VAULT_REQUEST,
      vault,
      new BN(request_id.toString()).toArrayLike(Buffer, 'le', 8),
    ],
    VAULTS_PROGRAM_ID,
  );
  return pda;
};

export const getPauseInxStatePda = (commonVault: PublicKey, inxId: number) => {
  const [pda] = findPDA(
    [VAULTS_SEEDS.PAUSE_INX, commonVault, toBN(inxId).toBuffer('le')],
    VAULTS_PROGRAM_ID,
  );
  return pda;
};

export const getPaymentMintStatePda = (commonVault: PublicKey, mint: PublicKey) => {
  const [pda] = findPDA([VAULTS_SEEDS.PAYMENT_MINT, commonVault, mint], VAULTS_PROGRAM_ID);
  return pda;
};

export const getCommonVaultAccountStatePda = (commonVault: PublicKey, account: PublicKey) => {
  const [pda] = findPDA(
    [VAULTS_SEEDS.VAULT_COMMON_ACCOUNT, commonVault, account],
    VAULTS_PROGRAM_ID,
  );
  return pda;
};

export const getVaultPda = (commonVault: PublicKey, vaultSeed: Buffer) => {
  const [pda] = findPDA([vaultSeed, commonVault], VAULTS_PROGRAM_ID);
  return pda;
};

/**
 * Fetches all minter vault requests for a given vault
 * @param program - The vaults program instance
 * @param vaultCommon - The common vault public key
 * @param onlyActive - If true, only return non-null (active) requests
 * @returns Array of request states with their IDs
 */
export const fetchAllMinterVaultRequests = async (
  program: VaultsProgram,
  vaultCommon: PublicKey,
  onlyActive = true,
) => {
  const commonState = await fetchVaultCommonState(program, vaultCommon);
  const requestsCount = commonState.requestsCount.toNumber();
  const minterVaultPda = getMinterVaultPda(vaultCommon);

  const requests: {
    id: bigint;
    state: Awaited<ReturnType<typeof fetchMinterVaultRequestState>> | null;
  }[] = [];

  for (let i = 0; i < requestsCount; i++) {
    const requestId = BigInt(i);
    const requestPda = getMinterVaultRequestPda(minterVaultPda, requestId);
    const requestState = await fetchMinterVaultRequestState(program, requestPda, true);

    if (!onlyActive || requestState !== null) {
      requests.push({
        id: requestId,
        state: requestState,
      });
    }
  }

  return requests;
};

/**
 * Fetches all redeemer vault requests for a given vault
 * @param program - The vaults program instance
 * @param vaultCommon - The common vault public key
 * @param onlyActive - If true, only return non-null (active) requests
 * @returns Array of request states with their IDs
 */
export const fetchAllRedeemerVaultRequests = async (
  program: VaultsProgram,
  vaultCommon: PublicKey,
  onlyActive = true,
) => {
  const commonState = await fetchVaultCommonState(program, vaultCommon);
  const requestsCount = commonState.requestsCount.toNumber();
  const redeemerVaultPda = getRedeemerVaultPda(vaultCommon);

  const requests: {
    id: bigint;
    state: Awaited<ReturnType<typeof fetchRedeemerVaultRequestState>> | null;
  }[] = [];

  for (let i = 0; i < requestsCount; i++) {
    const requestId = BigInt(i);
    const requestPda = getRedeemerVaultRequestPda(redeemerVaultPda, requestId);
    const requestState = await fetchRedeemerVaultRequestState(program, requestPda, true);

    if (!onlyActive || requestState !== null) {
      requests.push({
        id: requestId,
        state: requestState,
      });
    }
  }

  return requests;
};
