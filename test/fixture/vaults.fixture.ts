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
import { Transaction } from "@solana/web3.js";
import { dataFeedFixture } from "./dafa-feed.fixture";
import {
  generateAcAcccount,
  generateCommonVaultAccount,
  generateMinterVaultAccount,
  getMintAuthorityPda,
  getReservePda,
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
  } = dfFixture;

  const [feeReceiver, tokensReceiver, ...regularAccounts] = allRegularAccounts;
  const vaultsProgram = new Program<MidasVaults>(
    MIDAS_VAULTS_IDL as any,
    provider
  );

  const ac = generateAcAcccount();
  const minterCommonVault = generateCommonVaultAccount();

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

  await getOrCreateAta(
    context,
    provider.connection,
    usdcMint,
    authority.publicKey,
    authority
  );

  await getOrCreateAta(
    context,
    provider.connection,
    usdtMint,
    authority.publicKey,
    authority
  );

  await getOrCreateAta(
    context,
    provider.connection,
    mTBillMint.publicKey,
    authority.publicKey,
    authority,
    TOKEN_2022_PROGRAM_ID
  );

  await getOrCreateAta(
    context,
    provider.connection,
    usdcMint,
    tokensReceiver.publicKey,
    tokensReceiver
  );

  await getOrCreateAta(
    context,
    provider.connection,
    usdtMint,
    tokensReceiver.publicKey,
    tokensReceiver
  );

  await getOrCreateAta(
    context,
    provider.connection,
    mTBillMint.publicKey,
    tokensReceiver.publicKey,
    tokensReceiver,
    TOKEN_2022_PROGRAM_ID
  );

  await getOrCreateAta(
    context,
    provider.connection,
    usdcMint,
    feeReceiver.publicKey,
    feeReceiver
  );

  await getOrCreateAta(
    context,
    provider.connection,
    usdtMint,
    feeReceiver.publicKey,
    feeReceiver
  );

  await getOrCreateAta(
    context,
    provider.connection,
    mTBillMint.publicKey,
    feeReceiver.publicKey,
    feeReceiver,
    TOKEN_2022_PROGRAM_ID
  );

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
      .newAc(authority.publicKey)
      .accountsPartial({
        ac: ac.publicKey,
        payer: authority.publicKey,
      })
      .instruction(),
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
      .newMinterVault(
        toBN(0),
        Array.from(
          Uint8Array.from(mintAuthoritySeedToBuffer(mTBillMinterAuthoritySeed))
        )
      )
      .accountsPartial({
        vaultCommon: minterCommonVault.publicKey,
        authority: authority.publicKey,
      })
      .instruction(),
    await vaultsProgram.methods
      .newPauseInx(0)
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
    ac,
  ]);

  return {
    ...dfFixture,
    connection: provider.connection,
    vaultsProgram,
    feeReceiver,
    tokensReceiver,
    regularAccounts,
    minterCommonVault,
    ac,
    mTBillMint,
    paymentMints: {
      usdc: { mint: usdcMint, feed: dataFeedPaymentToken, decimals: 6 },
      usdt: { mint: usdtMint, feed: dataFeedPaymentToken, decimals: 8 },
    },
  };
};

export type VaultsFixtureReturnType = Awaited<ReturnType<typeof vaultsFixture>>;
