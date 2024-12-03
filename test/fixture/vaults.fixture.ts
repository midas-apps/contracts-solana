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
  generateAcAcccount,
  generateCommonVaultAccount,
  getMintAuthorityPda,
  getRedeemerVaultPda,
  mintAuthoritySeedToBuffer,
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
import { newMintAuthority } from "../testers/vaults.testers";
import { VaultActionIds } from "../constants/vaults.constants";
import { program } from "@coral-xyz/anchor/dist/cjs/native/system";

export const vaultsFixture = async () => {
  const dfFixture = await dataFeedFixture();

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

  const mTBillMinterAuthoritySeed = "mtbill-mint-authority";
  await newMintAuthority(
    { vaultsProgram, authority, context },
    {
      seed: mTBillMinterAuthoritySeed,
    }
  );

  const createMinterVaultTx = new Transaction().add(
    await vaultsProgram.methods
      .newCommonVault(
        ac.publicKey,
        mTBillMint.publicKey,
        dataFeedMTBill.publicKey,
        authority.publicKey,
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
        mintAuthority: getMintAuthorityPda(mTBillMinterAuthoritySeed),
      })
      .instruction(),
    await vaultsProgram.methods
      .newPauseInx(VaultActionIds.MINT_INSTANT)
      .accountsPartial({
        vaultCommonState: minterCommonVault.publicKey,
        authority: authority.publicKey,
      })
      .instruction(),
    await vaultsProgram.methods
      .newPauseInx(VaultActionIds.MINT_REQUEST)
      .accountsPartial({
        vaultCommonState: minterCommonVault.publicKey,
        authority: authority.publicKey,
      })
      .instruction(),
    // Transfer mint authority to program`s pda
    createSetAuthorityInstruction(
      mTBillMint.publicKey,
      authority.publicKey,
      AuthorityType.MintTokens,
      getMintAuthorityPda(mTBillMinterAuthoritySeed),
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
        authority.publicKey,
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
      })
      .instruction(),
    await vaultsProgram.methods
      .newPauseInx(VaultActionIds.REDEEM_INSTANT)
      .accountsPartial({
        vaultCommonState: redeemerCommonVault.publicKey,
        authority: authority.publicKey,
      })
      .instruction(),
    await vaultsProgram.methods
      .newPauseInx(VaultActionIds.REDEEM_REQUEST)
      .accountsPartial({
        vaultCommonState: redeemerCommonVault.publicKey,
        authority: authority.publicKey,
      })
      .instruction()
  );

  await processTransaction(context, createRedeemerVaultTx, [
    authority,
    redeemerCommonVault,
  ]);

  return {
    ...dfFixture,
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
