import { AnchorProvider } from '@coral-xyz/anchor';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { Keypair, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';

import { executeNetworkScript } from '@/common/scriptRunner';
import { fetchAccountAcState, getAccountAcStatePda } from '@/test/helpers/ac.helpers';
import { createAtaIfNotExistsInx, parseUnits, toBN } from '@/test/helpers/common.helpers';
import { fetchDataFeedState } from '@/test/helpers/data-feed.helpers';
import {
  fetchVaultCommonAccountState,
  fetchVaultCommonState,
  getCommonVaultAccountStatePda,
  getRedeemerVaultPda,
} from '@/test/helpers/vaults.helpers';

import { getAcProgram } from './deploy/contracts/ac';
import { getDataFeedProgram } from './deploy/contracts/dataFeed';
import { getVaultsProgram } from './deploy/contracts/vaults';
import { requireRedeemerVault } from './utils/addressValidators';
import { getMtoken, getNetwork, getAmount } from './utils/argumentParser';

async function main(provider: AnchorProvider, payer: Keypair) {
  const mtoken = getMtoken();
  const network = getNetwork();
  const amountStr = getAmount();

  console.log('=== Redeem Request Fiat Script ===');
  console.log(`Token: ${mtoken}`);
  console.log(`Amount: ${amountStr}`);
  console.log(`Network: ${network}`);
  console.log(`Deployer: ${payer.publicKey.toString()}`);
  console.log('');

  // Get token addresses
  const vaultCommon = requireRedeemerVault(network, mtoken);

  // Parse amount - mToken amounts use 9 decimals
  const mTokenDecimals = 9;
  const amount = parseUnits(amountStr, mTokenDecimals);

  const vaultsProgram = getVaultsProgram(provider);
  const feedProgram = getDataFeedProgram(provider);
  const acProgram = getAcProgram(provider);

  const commonState = await fetchVaultCommonState(vaultsProgram, vaultCommon);

  const mFeed = await fetchDataFeedState(feedProgram, commonState.mMintFeed);

  const acUser = await fetchAccountAcState(
    acProgram,
    getAccountAcStatePda(commonState.ac, payer.publicKey),
    true,
  );

  const commonUser = await fetchVaultCommonAccountState(
    vaultsProgram,
    getCommonVaultAccountStatePda(vaultCommon, payer.publicKey),
    true,
  );

  const ata = await createAtaIfNotExistsInx(
    provider.connection,
    commonState.mMint,
    payer.publicKey,
    payer,
    TOKEN_2022_PROGRAM_ID,
  );

  const ataReceiver = await createAtaIfNotExistsInx(
    provider.connection,
    commonState.mMint,
    commonState.tokensReceiver,
    payer,
    TOKEN_2022_PROGRAM_ID,
  );

  const vaultCreateMMinAtaInx = await createAtaIfNotExistsInx(
    provider.connection,
    commonState.mMint,
    getRedeemerVaultPda(vaultCommon),
    payer,
    TOKEN_2022_PROGRAM_ID,
  );

  const ataFeeReceiver = commonState.feeReceiver.equals(commonState.tokensReceiver)
    ? null
    : await createAtaIfNotExistsInx(
        provider.connection,
        commonState.mMint,
        commonState.feeReceiver,
        payer,
        TOKEN_2022_PROGRAM_ID,
      );

  // const tx1 = new Transaction();

  // tx1.add(
  //   await getSwitchboardPullInx(provider, mFeed.underlyingFeed, config.env)
  // );

  // const txRes1 = await sendAndConfirmTransaction(
  //   provider.connection,
  //   tx1,
  //   [payer],
  //   {
  //     commitment: "finalized",
  //   }
  // );
  const tx2 = new Transaction();

  if (ata) {
    console.log('ata');
    tx2.add(ata);
  }

  if (ataReceiver) {
    console.log('ata');
    tx2.add(ataReceiver);
  }

  if (ataFeeReceiver) {
    console.log('ata');
    tx2.add(ataFeeReceiver);
  }

  if (vaultCreateMMinAtaInx) {
    tx2.add(vaultCreateMMinAtaInx);
  }

  if (!acUser) {
    console.log('acUser');
    tx2.add(
      await acProgram.methods
        .newAccountAc()
        .accountsPartial({
          ac: commonState.ac,
          account: payer.publicKey,
          accountAc: getAccountAcStatePda(commonState.ac, payer.publicKey),
          signer: payer.publicKey,
        })
        .instruction(),
    );
  }

  if (!commonUser) {
    console.log('commonUser');
    tx2.add(
      await vaultsProgram.methods
        .newCommonVaultAccount()
        .accountsPartial({
          account: payer.publicKey,
          vaultCommon,
          vaultCommonAccount: getCommonVaultAccountStatePda(vaultCommon, payer.publicKey),
          signer: payer.publicKey,
        })
        .instruction(),
    );
  }

  tx2.add(
    await vaultsProgram.methods
      .redeemRequestFiat(toBN(amount))
      .accountsPartial({
        vaultCommon: vaultCommon,
        redeemerVault: getRedeemerVaultPda(vaultCommon),
        ac: commonState.ac,
        mMint: commonState.mMint,
        mMintFeed: mFeed.underlyingFeed,
        mMintTokenProgram: TOKEN_2022_PROGRAM_ID,
        mMintDataFeed: commonState.mMintFeed,
        signer: payer.publicKey,
        accountAc: getAccountAcStatePda(commonState.ac, payer.publicKey),
      })
      .instruction(),
  );

  const txRes = await sendAndConfirmTransaction(provider.connection, tx2, [payer], {
    commitment: 'finalized',
  });

  console.log(`✅ Redeem request fiat completed successfully!`);
  console.log(`Transaction: ${txRes}`);
}

const network = getNetwork();
executeNetworkScript(network, main);
