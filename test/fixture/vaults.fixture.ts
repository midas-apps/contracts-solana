import {
  createMint,
  getOrCreateAta,
  initBankrun,
  parseUnits,
  processTransaction,
  toBN,
} from "../helpers/common.helpers";

import { Program } from "@coral-xyz/anchor";

import * as DATA_FEED_IDL from "../../target/idl/data_feed.json";
import * as MIDAS_VAULTS_IDL from "../../target/idl/midas_vaults.json";
import {
  generateFeedAcccount,
  getManualFeedStatePda,
} from "../helpers/data-feed.helpers";
import { DataFeed } from "@/target/types/data_feed";
import { MidasVaults } from "@/target/types/midas_vaults";
import { PublicKey, Transaction } from "@solana/web3.js";
import { dataFeedFixture } from "./dafa-feed.fixture";
import {
  generateAcAccount,
  generateCommonVaultAccount,
  getMinterVaultPda,
  getRedeemerVaultPda,
} from "../helpers/vaults.helpers";
import { createMTokenMint } from "../../common/create-mtoken-mint";
import {
  AuthorityType,
  createMintToInstruction,
  createSetAuthorityInstruction,
  getAssociatedTokenAddressSync,
  mintTo,
  mintToInstructionData,
  TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { MAX_U128 } from "../constants/common.constants";
import { VAULT_AC_ROLES, VaultActionIds } from "../constants/vaults.constants";
import { program } from "@coral-xyz/anchor/dist/cjs/native/system";
import {
  acRoleToBuffer,
  getAccountAcRoleStatePda,
} from "../helpers/ac.helpers";
import { AC_ROLES } from "../constants/ac.constants";
import { tokenAuthorityFixture } from "./token-authority.fixture";
import { TOKEN_AUTHORITY_ROLES } from "../constants/token-authority.constants";
import { getTokenAuthorityPda } from "../helpers/token-authority.helpers";

export const vaultsFixture = async () => {
  const dfFixture = await dataFeedFixture();
  const taFixture = await tokenAuthorityFixture(dfFixture);

  const {
    accounts,
    authority,
    context,
    dataFeedMTBill,
    dataFeedPaymentToken,
    dataFeedProgram,
    manualUnderlyingFeedMTBill,
    manualUnderlyingFeedPaymentToken,
    provider,
    regularAccounts: allRegularAccounts,
    acProgram,
    ac,
    acRoleGlobal,
    acRoleMTbill,
  } = dfFixture;

  const { tokenAuthorityProgram, mTBillMinterAuthoritySeed } = taFixture;

  const [feeReceiver, tokensReceiver, requestRedeemer, ...regularAccounts] =
    allRegularAccounts;
  const vaultsProgram = new Program<MidasVaults>(
    MIDAS_VAULTS_IDL as any,
    provider
  );

  const minterCommonVault = generateCommonVaultAccount();
  const redeemerCommonVault = generateCommonVaultAccount();

  const mTBillMint = await createMTokenMint({
    payer: authority,
    authority: authority.publicKey,
    connection: provider.connection,
    metadata: {
      additionalMetadata: [],
      name: "mTBILL",
      symbol: "mTBILL",
      uri: "",
    },
    sendTxFn: (_, tx, signers) => processTransaction(context, tx, signers),
  });

  const usdcMint = await createMint(
    provider.connection,
    context,
    authority,
    authority.publicKey,
    authority.publicKey,
    6
  );

  const usdtMint = await createMint(
    provider.connection,
    context,
    authority,
    authority.publicKey,
    authority.publicKey,
    8
  );

  const toCreateAtas = [
    ...[
      authority.publicKey,
      tokensReceiver.publicKey,
      feeReceiver.publicKey,
      requestRedeemer.publicKey,
    ].map((a) => ({
      mint: usdcMint,
      owner: a,
      program: undefined,
    })),

    ...[
      authority.publicKey,
      tokensReceiver.publicKey,
      feeReceiver.publicKey,
      requestRedeemer.publicKey,
    ].map((a) => ({
      mint: usdtMint,
      owner: a,
      program: undefined,
    })),

    ...[
      authority.publicKey,
      getRedeemerVaultPda(redeemerCommonVault.publicKey),
      feeReceiver.publicKey,
    ].map((a) => ({
      mint: mTBillMint.publicKey,
      owner: a,
      program: TOKEN_2022_PROGRAM_ID,
    })),
  ];

  for (let createAta of toCreateAtas) {
    await getOrCreateAta(
      context,
      provider.connection,
      createAta.mint,
      createAta.owner,
      authority,
      createAta.program
    );
  }

  await processTransaction(
    context,
    new Transaction().add(
      createMintToInstruction(
        usdcMint,
        getAssociatedTokenAddressSync(usdcMint, authority.publicKey, true),
        authority.publicKey,
        parseUnits("100000", 6)
      ),
      createMintToInstruction(
        usdtMint,
        getAssociatedTokenAddressSync(usdtMint, authority.publicKey, true),
        authority.publicKey,
        parseUnits("100000", 8)
      )
    ),
    [authority]
  );

  const createMinterVaultTx = new Transaction().add(
    await acProgram.methods
      .grantRole(acRoleToBuffer(VAULT_AC_ROLES.VAULT_ADMIN))
      .accountsPartial({
        account: authority.publicKey,
        acRole: acRoleMTbill.publicKey,
        authority: authority.publicKey,
        authorityAcAdminRole: getAccountAcRoleStatePda(
          acRoleMTbill.publicKey,
          authority.publicKey,
          AC_ROLES.ADMIN
        ),
        accountAcRole: getAccountAcRoleStatePda(
          acRoleMTbill.publicKey,
          authority.publicKey,
          VAULT_AC_ROLES.VAULT_ADMIN
        ),
      })
      .instruction(),
    await acProgram.methods
      .grantRole(acRoleToBuffer(VAULT_AC_ROLES.VAULT_PAUSER))
      .accountsPartial({
        account: authority.publicKey,
        acRole: acRoleMTbill.publicKey,
        authority: authority.publicKey,
        authorityAcAdminRole: getAccountAcRoleStatePda(
          acRoleMTbill.publicKey,
          authority.publicKey,
          AC_ROLES.ADMIN
        ),
        accountAcRole: getAccountAcRoleStatePda(
          acRoleMTbill.publicKey,
          authority.publicKey,
          VAULT_AC_ROLES.VAULT_PAUSER
        ),
      })
      .instruction(),
    await acProgram.methods
      .grantRole(acRoleToBuffer(TOKEN_AUTHORITY_ROLES.M_MINTER))
      .accountsPartial({
        account: getMinterVaultPda(minterCommonVault.publicKey),
        acRole: acRoleMTbill.publicKey,
        authority: authority.publicKey,
        authorityAcAdminRole: getAccountAcRoleStatePda(
          acRoleMTbill.publicKey,
          authority.publicKey,
          AC_ROLES.ADMIN
        ),
        accountAcRole: getAccountAcRoleStatePda(
          acRoleMTbill.publicKey,
          getMinterVaultPda(minterCommonVault.publicKey),
          TOKEN_AUTHORITY_ROLES.M_MINTER
        ),
      })
      .instruction(),
    await vaultsProgram.methods
      .newCommonVault(
        ac.publicKey,
        mTBillMint.publicKey,
        dataFeedMTBill.publicKey,
        false,
        acRoleMTbill.publicKey,
        tokensReceiver.publicKey,
        feeReceiver.publicKey,
        toBN(0),
        toBN(MAX_U128),
        toBN(parseUnits("10", 2)),
        toBN(0)
      )
      .accountsPartial({
        vaultCommon: minterCommonVault.publicKey,
        signer: authority.publicKey,
      })
      .instruction(),
    await vaultsProgram.methods
      .newMinterVault(toBN(0))
      .accountsPartial({
        vaultCommon: minterCommonVault.publicKey,
        authority: authority.publicKey,
        tokenAuthority: getTokenAuthorityPda(mTBillMinterAuthoritySeed),
        authorityAcRole: getAccountAcRoleStatePda(
          acRoleMTbill.publicKey,
          authority.publicKey,
          VAULT_AC_ROLES.VAULT_ADMIN
        ),
      })
      .instruction(),
    await vaultsProgram.methods
      .newPauseInx(VaultActionIds.MINT_INSTANT)
      .accountsPartial({
        vaultCommon: minterCommonVault.publicKey,
        authority: authority.publicKey,
        authorityAcRole: getAccountAcRoleStatePda(
          acRoleMTbill.publicKey,
          authority.publicKey,
          VAULT_AC_ROLES.VAULT_PAUSER
        ),
      })
      .instruction(),
    await vaultsProgram.methods
      .newPauseInx(VaultActionIds.MINT_REQUEST)
      .accountsPartial({
        vaultCommon: minterCommonVault.publicKey,
        authority: authority.publicKey,
        authorityAcRole: getAccountAcRoleStatePda(
          acRoleMTbill.publicKey,
          authority.publicKey,
          VAULT_AC_ROLES.VAULT_PAUSER
        ),
      })
      .instruction(),
    // Transfer mint authority to program`s pda
    createSetAuthorityInstruction(
      mTBillMint.publicKey,
      authority.publicKey,
      AuthorityType.MintTokens,
      getTokenAuthorityPda(mTBillMinterAuthoritySeed),
      undefined,
      TOKEN_2022_PROGRAM_ID
    )
  );

  await processTransaction(context, createMinterVaultTx, [
    authority,
    minterCommonVault,
  ]);

  const createRedeemerVaultTx = new Transaction().add(
    await vaultsProgram.methods
      .newCommonVault(
        ac.publicKey,
        mTBillMint.publicKey,
        dataFeedMTBill.publicKey,
        false,
        acRoleMTbill.publicKey,
        tokensReceiver.publicKey,
        feeReceiver.publicKey,
        toBN(0),
        toBN(MAX_U128),
        toBN(parseUnits("10", 2)),
        toBN(0)
      )
      .accountsPartial({
        vaultCommon: redeemerCommonVault.publicKey,
        signer: authority.publicKey,
      })
      .instruction(),
    await vaultsProgram.methods
      .newRedeemerVault(toBN(0), toBN(0), toBN(0))
      .accountsPartial({
        vaultCommon: redeemerCommonVault.publicKey,
        authority: authority.publicKey,
        authorityAcRole: getAccountAcRoleStatePda(
          acRoleMTbill.publicKey,
          authority.publicKey,
          VAULT_AC_ROLES.VAULT_ADMIN
        ),
      })
      .instruction(),
    await vaultsProgram.methods
      .newPauseInx(VaultActionIds.REDEEM_INSTANT)
      .accountsPartial({
        vaultCommon: redeemerCommonVault.publicKey,
        authority: authority.publicKey,
        authorityAcRole: getAccountAcRoleStatePda(
          acRoleMTbill.publicKey,
          authority.publicKey,
          VAULT_AC_ROLES.VAULT_PAUSER
        ),
      })
      .instruction(),
    await vaultsProgram.methods
      .newPauseInx(VaultActionIds.REDEEM_REQUEST)
      .accountsPartial({
        vaultCommon: redeemerCommonVault.publicKey,
        authority: authority.publicKey,
        authorityAcRole: getAccountAcRoleStatePda(
          acRoleMTbill.publicKey,
          authority.publicKey,
          VAULT_AC_ROLES.VAULT_PAUSER
        ),
      })
      .instruction()
  );

  await processTransaction(context, createRedeemerVaultTx, [
    authority,
    redeemerCommonVault,
  ]);

  return {
    ...dfFixture,
    ...taFixture,
    connection: provider.connection,
    vaultsProgram,
    feeReceiver,
    tokensReceiver,
    regularAccounts,
    minterCommonVault,
    redeemerCommonVault,
    mTBillMinterAuthoritySeed,
    mTBillMint,
    requestRedeemer,
    paymentMints: {
      usdc: { mint: usdcMint, feed: dataFeedPaymentToken, decimals: 6 },
      usdt: { mint: usdtMint, feed: dataFeedPaymentToken, decimals: 8 },
    },
  };
};

export type VaultsFixtureReturnType = Awaited<ReturnType<typeof vaultsFixture>>;
