import { AnchorProvider, Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from "@solana/web3.js";
import * as VAULTS_IDL from "../../../target/idl/midas_vaults.json";
import { CommonParams } from "./common";
import {
  acRoleToBuffer,
  getAccountAcRoleStatePda,
} from "../../../test/helpers/ac.helpers";
import { AC_ROLES } from "../../../test/constants/ac.constants";
import { AccessControl } from "../../../target/types/access_control";
import {
  getTokenAuthorityPda,
  mintAuthoritySeedToBuffer,
} from "@/test/helpers/token-authority.helpers";
import { MidasVaults } from "@/target/types/midas_vaults";
import { getAcProgram } from "./ac";
import {
  VAULT_AC_ROLES,
  VaultActionIds,
} from "@/test/constants/vaults.constants";
import { TOKEN_AUTHORITY_ROLES } from "@/test/constants/token-authority.constants";
import {
  fetchRedeemerVaultState,
  fetchVaultCommonState,
  getMinterVaultPda,
  getRedeemerVaultPda,
} from "@/test/helpers/vaults.helpers";
import { createAtaIfNotExistsInx, toBN } from "@/test/helpers/common.helpers";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

export const getVaultsProgram = (provider: AnchorProvider) => {
  return new Program<MidasVaults>(VAULTS_IDL as any, provider);
};

export type DeployMinterVaultConfig = {
  acRole: PublicKey;
  ac: PublicKey;
  commonVault?: Keypair;
  mToken: PublicKey;
  mTokenFeed: PublicKey;
  greenListEnforced: boolean;
  tokensReceiver?: PublicKey;
  feeReceiver?: PublicKey;
  instantFee: bigint;
  instantDailyLimit: bigint;
  variationTolerance: bigint;
  minAmount: bigint;
  tokenAuthority: PublicKey;
  firstMintMinMTokens: bigint;
};

export type DeployRedeemerVaultConfig = {
  acRole: PublicKey;
  ac: PublicKey;
  commonVault?: Keypair;
  mToken: PublicKey;
  mTokenFeed: PublicKey;
  greenListEnforced: boolean;
  tokensReceiver?: PublicKey;
  feeReceiver?: PublicKey;
  instantFee: bigint;
  instantDailyLimit: bigint;
  variationTolerance: bigint;
  minAmount: bigint;
  requestRedeemer?: PublicKey;
  minFiatRedeemAmount: bigint;
  fiatFlatFee: bigint;
};

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
  }: DeployMinterVaultConfig
) => {
  commonVault ??= Keypair.generate();

  tokensReceiver ??= common.payer.publicKey;
  feeReceiver ??= common.payer.publicKey;

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
          AC_ROLES.ADMIN
        ),
        accountAcRole: getAccountAcRoleStatePda(
          acRole,
          common.provider.publicKey,
          VAULT_AC_ROLES.VAULT_ADMIN
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
          AC_ROLES.ADMIN
        ),
        accountAcRole: getAccountAcRoleStatePda(
          acRole,
          common.provider.publicKey,
          VAULT_AC_ROLES.VAULT_PAUSER
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
          AC_ROLES.ADMIN
        ),
        accountAcRole: getAccountAcRoleStatePda(
          acRole,
          getMinterVaultPda(commonVault.publicKey),
          TOKEN_AUTHORITY_ROLES.M_MINTER
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
        toBN(minAmount)
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
          VAULT_AC_ROLES.VAULT_ADMIN
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
          VAULT_AC_ROLES.VAULT_PAUSER
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
          VAULT_AC_ROLES.VAULT_PAUSER
        ),
      })
      .instruction()
  );

  const txRes = await sendAndConfirmTransaction(
    common.provider.connection,
    tx,
    [common.payer, commonVault],
    {
      commitment: "finalized",
    }
  );

  console.log({
    txRes,
    commonVault: commonVault.publicKey,
    minterVault: getMinterVaultPda(commonVault.publicKey),
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
  }: DeployRedeemerVaultConfig
) => {
  commonVault ??= Keypair.generate();

  tokensReceiver ??= common.payer.publicKey;
  feeReceiver ??= common.payer.publicKey;
  requestRedeemer ??= common.payer.publicKey;

  const vaultsProgram = getVaultsProgram(common.provider);

  const commonState = await fetchVaultCommonState(
    vaultsProgram,
    commonVault.publicKey
  );
  const vaultState = await fetchRedeemerVaultState(
    vaultsProgram,
    getRedeemerVaultPda(commonVault.publicKey)
  );

  const ataVault = await createAtaIfNotExistsInx(
    common.provider.connection,
    mToken,
    common.payer.publicKey,
    common.payer,
    TOKEN_2022_PROGRAM_ID
  );

  const ataReceiver = await createAtaIfNotExistsInx(
    common.provider.connection,
    mToken,
    commonState.tokensReceiver,
    common.payer,
    TOKEN_2022_PROGRAM_ID
  );

  const ataFeeReceiver = commonState.feeReceiver.equals(
    commonState.tokensReceiver
  )
    ? null
    : await createAtaIfNotExistsInx(
        common.provider.connection,
        commonState.mMint,
        commonState.feeReceiver,
        common.payer,
        TOKEN_2022_PROGRAM_ID
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
        toBN(minAmount)
      )
      .accountsPartial({
        vaultCommon: commonVault.publicKey,
        signer: common.payer.publicKey,
      })
      .instruction(),
    await vaultsProgram.methods
      .newRedeemerVault(
        requestRedeemer,
        toBN(minFiatRedeemAmount),
        toBN(fiatFlatFee)
      )
      .accountsPartial({
        vaultCommon: commonVault.publicKey,
        authority: common.payer.publicKey,
        authorityAcRole: getAccountAcRoleStatePda(
          acRole,
          common.payer.publicKey,
          VAULT_AC_ROLES.VAULT_ADMIN
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
          VAULT_AC_ROLES.VAULT_PAUSER
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
          VAULT_AC_ROLES.VAULT_PAUSER
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
          VAULT_AC_ROLES.VAULT_PAUSER
        ),
      })
      .instruction()
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

  const txRes = await sendAndConfirmTransaction(
    common.provider.connection,
    tx,
    [common.payer, commonVault],
    {
      commitment: "finalized",
    }
  );

  console.log({
    txRes,
    commonVault: commonVault.publicKey,
    redeemerVault: getRedeemerVaultPda(commonVault.publicKey),
  });

  return commonVault.publicKey;
};
