import { AnchorProvider } from '@coral-xyz/anchor';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { Keypair, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';

import { executeNetworkScript } from '@/common/utils';
import { fetchAccountAcState, getAccountAcStatePda } from '@/test/helpers/ac.helpers';
import { createAtaIfNotExistsInx, parseUnits, toBN } from '@/test/helpers/common.helpers';
import { fetchDataFeedState } from '@/test/helpers/data-feed.helpers';
import {
  fetchPaymentMintState,
  fetchVaultCommonAccountState,
  fetchVaultCommonState,
  getCommonVaultAccountStatePda,
  getPaymentMintStatePda,
  getRedeemerVaultPda,
} from '@/test/helpers/vaults.helpers';

import { getAcProgram } from './deploy/contracts/ac';
import { getDataFeedProgram } from './deploy/contracts/dataFeed';
import { getVaultsProgram } from './deploy/contracts/vaults';
import { getFeedAddresses, getTokenAddresses } from './utils/addressManager';
import { getMtoken, getNetwork, getPaymentToken, getAmount } from './utils/argumentParser';

async function main(provider: AnchorProvider, payer: Keypair) {
  const mtoken = getMtoken();
  const network = getNetwork();
  const paymentToken = getPaymentToken();
  const amountStr = getAmount();

  console.log(`╔════════════════════════════════════════════════╗`);
  console.log(`║          Redeem Request Script                ║`);
  console.log(`╚════════════════════════════════════════════════╝`);
  console.log(`Token: ${mtoken}`);
  console.log(`Payment Token: ${paymentToken}`);
  console.log(`Amount: ${amountStr}`);
  console.log(`Network: ${network}`);
  console.log(`Deployer: ${payer.publicKey.toString()}`);
  console.log('');

  // Get token addresses
  const tokenAddrs = getTokenAddresses(network, mtoken);
  if (!tokenAddrs?.redeemer?.commonVault) {
    throw new Error(`Redeemer vault not found for ${mtoken} on ${network}`);
  }

  // Get payment token feed address
  const feedAddr = getFeedAddresses(network, paymentToken);
  if (!feedAddr?.token) {
    throw new Error(`Payment token mint not found for ${paymentToken} on ${network}`);
  }
  if (!feedAddr?.dataFeed) {
    throw new Error(`Feed not found for payment token ${paymentToken} on ${network}`);
  }

  // Parse amount - mToken amounts use 9 decimals
  const mTokenDecimals = 9;
  const amount = parseUnits(amountStr, mTokenDecimals);

  const vaultsProgram = getVaultsProgram(provider);
  const feedProgram = getDataFeedProgram(provider);
  const acProgram = getAcProgram(provider);

  const vaultCommon = tokenAddrs.redeemer.commonVault;

  const commonState = await fetchVaultCommonState(vaultsProgram, vaultCommon);

  const mFeed = await fetchDataFeedState(feedProgram, commonState.mMintFeed);
  const payment = await fetchPaymentMintState(
    vaultsProgram,
    getPaymentMintStatePda(vaultCommon, feedAddr.token),
  );
  const paymentFeed = await fetchDataFeedState(feedProgram, payment.dataFeed);

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

  const vaultCreateAtaInx = await createAtaIfNotExistsInx(
    provider.connection,
    feedAddr.token,
    getRedeemerVaultPda(vaultCommon),
    payer,
    feedAddr.tokenProgram,
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

  if (vaultCreateAtaInx) {
    tx2.add(vaultCreateAtaInx);
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
      .redeemRequest(toBN(amount))
      .accountsPartial({
        vaultCommon: vaultCommon,
        redeemerVault: getRedeemerVaultPda(vaultCommon),
        ac: commonState.ac,
        mMint: commonState.mMint,
        mMintFeed: mFeed.underlyingFeed,
        mMintTokenProgram: TOKEN_2022_PROGRAM_ID,
        mMintDataFeed: commonState.mMintFeed,
        signer: payer.publicKey,
        paymentMint: feedAddr.token,
        paymentMintDataFeed: payment.dataFeed,
        paymentMintFeed: paymentFeed.underlyingFeed,
        paymentMintTokenProgram: feedAddr.tokenProgram,
        accountAc: getAccountAcStatePda(commonState.ac, payer.publicKey),
      })
      .instruction(),
  );

  const txRes = await sendAndConfirmTransaction(provider.connection, tx2, [payer], {
    commitment: 'finalized',
  });

  console.log(`✅ Redeem request completed successfully!`);
  console.log(`Transaction: ${txRes}`);
}

const network = getNetwork();
executeNetworkScript(network, main);
