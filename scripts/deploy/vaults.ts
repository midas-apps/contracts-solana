import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';

import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';
import { MidasVaults } from '@/target/types/midas_vaults';
import { TOKEN_AUTHORITY_ROLES } from '@/test/constants/token-authority.constants';
import { VAULT_AC_ROLES, VaultActionIds } from '@/test/constants/vaults.constants';
import { createAtaIfNotExistsInx, toBN } from '@/test/helpers/common.helpers';
import { getMinterVaultPda } from '@/test/helpers/vaults.helpers';

import VAULTS_IDL from '../../target/idl/midas_vaults.json' with { type: 'json' };
import { AC_ROLES } from '../../test/constants/ac.constants';
import { acRoleToBuffer, getAccountAcRoleStatePda } from '../../test/helpers/ac.helpers';

import { getAcProgram } from './ac';
import { CommonParams } from './dataFeed';

export const getVaultsProgram = (provider: AnchorProvider) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new Program<MidasVaults>(VAULTS_IDL as any, provider);
};

export interface DeployMinterVaultConfig {
  acRole: PublicKey;
  ac: PublicKey;
  commonVault?: Keypair;
  mToken: PublicKey;
  mTokenFeed: PublicKey;
  greenListEnforced: boolean;
  tokensReceiver: PublicKey;
  feeReceiver: PublicKey;
  instantFee: bigint;
  instantDailyLimit: bigint;
  variationTolerance: bigint;
  minAmount: bigint;
  tokenAuthority: PublicKey;
  firstMintMinMTokens: bigint;
}

export interface DeployRedeemerVaultConfig {
  acRole: PublicKey;
  ac: PublicKey;
  commonVault?: Keypair;
  mToken: PublicKey;
  mTokenFeed: PublicKey;
  greenListEnforced: boolean;
  tokensReceiver: PublicKey;
  feeReceiver: PublicKey;
  instantFee: bigint;
  instantDailyLimit: bigint;
  variationTolerance: bigint;
  minAmount: bigint;
  requestRedeemer: PublicKey;
  minFiatRedeemAmount: bigint;
  fiatFlatFee: bigint;
}

export const deployMinterVault = async (
  common: CommonParams,
  {
    acRole,
    commonVault,
    ac,
    feeReceiver,
    mToken,
    tokenAuthority,
    firstMintMinMTokens,
    greenListEnforced,
    instantDailyLimit,
    instantFee,
    mTokenFeed,
    minAmount,
    tokensReceiver,
    variationTolerance,
  }: DeployMinterVaultConfig,
) => {
  commonVault ??= Keypair.generate();

  const vaultsProgram = getVaultsProgram(common.provider);
  const acProgram = getAcProgram(common.provider);

  const tx = new Transaction().add(
    await acProgram.methods
      .grantRole(acRoleToBuffer(VAULT_AC_ROLES.VAULT_ADMIN))
      .accountsPartial({
        account: common.provider.publicKey,
        acRole: acRole,
        authority: common.provider.publicKey,
        authorityAcAdminRole: getAccountAcRoleStatePda(
          acRole,
          common.provider.publicKey,
          AC_ROLES.ADMIN,
        ),
        accountAcRole: getAccountAcRoleStatePda(
          acRole,
          common.provider.publicKey,
          VAULT_AC_ROLES.VAULT_ADMIN,
        ),
      })
      .instruction(),
    await acProgram.methods
      .grantRole(acRoleToBuffer(VAULT_AC_ROLES.VAULT_PAUSER))
      .accountsPartial({
        account: common.provider.publicKey,
        acRole: acRole,
        authority: common.provider.publicKey,
        authorityAcAdminRole: getAccountAcRoleStatePda(
          acRole,
          common.provider.publicKey,
          AC_ROLES.ADMIN,
        ),
        accountAcRole: getAccountAcRoleStatePda(
          acRole,
          common.provider.publicKey,
          VAULT_AC_ROLES.VAULT_PAUSER,
        ),
      })
      .instruction(),
    await acProgram.methods
      .grantRole(acRoleToBuffer(TOKEN_AUTHORITY_ROLES.M_MINTER))
      .accountsPartial({
        account: getMinterVaultPda(commonVault.publicKey),
        acRole: acRole,
        authority: common.provider.publicKey,
        authorityAcAdminRole: getAccountAcRoleStatePda(
          acRole,
          common.provider.publicKey,
          AC_ROLES.ADMIN,
        ),
        accountAcRole: getAccountAcRoleStatePda(
          acRole,
          getMinterVaultPda(commonVault.publicKey),
          TOKEN_AUTHORITY_ROLES.M_MINTER,
        ),
      })
      .instruction(),
    await vaultsProgram.methods
      .newCommonVault(
        ac,
        mToken,
        mTokenFeed,
        greenListEnforced,
        acRole,
        tokensReceiver,
        feeReceiver,
        toBN(instantFee),
        toBN(instantDailyLimit),
        toBN(variationTolerance),
        toBN(minAmount),
      )
      .accountsPartial({
        vaultCommon: commonVault.publicKey,
        signer: common.payer.publicKey,
      })
      .instruction(),
    await vaultsProgram.methods
      .newMinterVault(toBN(firstMintMinMTokens))
      .accountsPartial({
        vaultCommon: commonVault.publicKey,
        authority: common.payer.publicKey,
        tokenAuthority: tokenAuthority,
        authorityAcRole: getAccountAcRoleStatePda(
          acRole,
          common.payer.publicKey,
          VAULT_AC_ROLES.VAULT_ADMIN,
        ),
      })
      .instruction(),
    await vaultsProgram.methods
      .newPauseInx(VaultActionIds.MINT_INSTANT)
      .accountsPartial({
        vaultCommon: commonVault.publicKey,
        authority: common.payer.publicKey,
        authorityAcRole: getAccountAcRoleStatePda(
          acRole,
          common.payer.publicKey,
          VAULT_AC_ROLES.VAULT_PAUSER,
        ),
      })
      .instruction(),
    await vaultsProgram.methods
      .newPauseInx(VaultActionIds.MINT_REQUEST)
      .accountsPartial({
        vaultCommon: commonVault.publicKey,
        authority: common.payer.publicKey,
        authorityAcRole: getAccountAcRoleStatePda(
          acRole,
          common.payer.publicKey,
          VAULT_AC_ROLES.VAULT_PAUSER,
        ),
      })
      .instruction(),
  );

  await sendAndWaitForCustomSolanaTxSign(common.provider, tx, [commonVault], {
    action: 'deployer',
    comment: 'Deploy Minter Vault',
    waitForTx: true,
    pollingIntervalMs: 1000,
    timeoutDurationMs: 120 * 1000,
  });

  return commonVault.publicKey;
};

export const deployRedeemerVault = async (
  common: CommonParams,
  {
    acRole,
    commonVault,
    ac,
    feeReceiver,
    mToken,
    greenListEnforced,
    instantDailyLimit,
    instantFee,
    mTokenFeed,
    minAmount,
    tokensReceiver,
    variationTolerance,
    fiatFlatFee,
    minFiatRedeemAmount,
    requestRedeemer,
  }: DeployRedeemerVaultConfig,
) => {
  commonVault ??= Keypair.generate();

  const vaultsProgram = getVaultsProgram(common.provider);

  const ataVault = await createAtaIfNotExistsInx(
    common.provider.connection,
    mToken,
    common.payer.publicKey,
    common.payer,
    TOKEN_2022_PROGRAM_ID,
  );

  // Only create ataReceiver if tokensReceiver is different from payer
  // (to avoid creating duplicate ATAs for the same owner)
  const ataReceiver = tokensReceiver.equals(common.payer.publicKey)
    ? null
    : await createAtaIfNotExistsInx(
        common.provider.connection,
        mToken,
        tokensReceiver,
        common.payer,
        TOKEN_2022_PROGRAM_ID,
      );

  // Only create ataFeeReceiver if feeReceiver is different from tokensReceiver and payer
  const ataFeeReceiver =
    feeReceiver.equals(tokensReceiver) || feeReceiver.equals(common.payer.publicKey)
      ? null
      : await createAtaIfNotExistsInx(
          common.provider.connection,
          mToken,
          feeReceiver,
          common.payer,
          TOKEN_2022_PROGRAM_ID,
        );

  const tx = new Transaction().add(
    await vaultsProgram.methods
      .newCommonVault(
        ac,
        mToken,
        mTokenFeed,
        greenListEnforced,
        acRole,
        tokensReceiver,
        feeReceiver,
        toBN(instantFee),
        toBN(instantDailyLimit),
        toBN(variationTolerance),
        toBN(minAmount),
      )
      .accountsPartial({
        vaultCommon: commonVault.publicKey,
        signer: common.payer.publicKey,
      })
      .instruction(),
    await vaultsProgram.methods
      .newRedeemerVault(requestRedeemer, toBN(minFiatRedeemAmount), toBN(fiatFlatFee))
      .accountsPartial({
        vaultCommon: commonVault.publicKey,
        authority: common.payer.publicKey,
        authorityAcRole: getAccountAcRoleStatePda(
          acRole,
          common.payer.publicKey,
          VAULT_AC_ROLES.VAULT_ADMIN,
        ),
      })
      .instruction(),
    await vaultsProgram.methods
      .newPauseInx(VaultActionIds.REDEEM_INSTANT)
      .accountsPartial({
        vaultCommon: commonVault.publicKey,
        authority: common.payer.publicKey,
        authorityAcRole: getAccountAcRoleStatePda(
          acRole,
          common.payer.publicKey,
          VAULT_AC_ROLES.VAULT_PAUSER,
        ),
      })
      .instruction(),
    await vaultsProgram.methods
      .newPauseInx(VaultActionIds.REDEEM_REQUEST)
      .accountsPartial({
        vaultCommon: commonVault.publicKey,
        authority: common.payer.publicKey,
        authorityAcRole: getAccountAcRoleStatePda(
          acRole,
          common.payer.publicKey,
          VAULT_AC_ROLES.VAULT_PAUSER,
        ),
      })
      .instruction(),
    await vaultsProgram.methods
      .newPauseInx(VaultActionIds.REDEEM_REQUEST_FIAT)
      .accountsPartial({
        vaultCommon: commonVault.publicKey,
        authority: common.payer.publicKey,
        authorityAcRole: getAccountAcRoleStatePda(
          acRole,
          common.payer.publicKey,
          VAULT_AC_ROLES.VAULT_PAUSER,
        ),
      })
      .instruction(),
  );

  if (ataVault) {
    tx.add(ataVault);
  }

  if (ataFeeReceiver) {
    tx.add(ataFeeReceiver);
  }

  if (ataReceiver) {
    tx.add(ataReceiver);
  }

  await sendAndWaitForCustomSolanaTxSign(common.provider, tx, [commonVault], {
    action: 'deployer',
    comment: 'Deploy Redeemer Vault',
    waitForTx: true,
    pollingIntervalMs: 1000,
    timeoutDurationMs: 120 * 1000,
  });

  return commonVault.publicKey;
};
