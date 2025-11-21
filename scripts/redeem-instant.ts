import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { Transaction } from '@solana/web3.js';

import { executeNetworkScript } from '@/common/scriptRunner';
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

import { getAcProgram } from './deploy/ac';
import { getDataFeedProgram } from './deploy/dataFeed';
import { getSwitchboardPullInx } from './deploy/feeds/switchboard';
import { getVaultsProgram } from './deploy/vaults';
import { requireRedeemerVault, requirePaymentTokenFeed } from './utils/addressValidators';
import { getMtoken, getNetwork, getPaymentToken, getAmount } from './utils/argumentParser';

async function main(provider: AnchorProvider, payer: Wallet) {
  const mtoken = getMtoken();
  const network = getNetwork();
  const paymentToken = getPaymentToken();
  const amountStr = getAmount();

  console.log(`Redeeming ${amountStr} ${mtoken} for ${paymentToken} tokens instantly`);

  // Get token addresses
  const vaultCommon = requireRedeemerVault(network, mtoken);

  // Get payment token feed address
  const feedAddr = requirePaymentTokenFeed(network, paymentToken, mtoken);

  // Parse amount
  const mTokenDecimals = 9;
  const amount = parseUnits(amountStr, mTokenDecimals);

  const vaultsProgram = getVaultsProgram(provider);
  const feedProgram = getDataFeedProgram(provider);
  const acProgram = getAcProgram(provider);

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

  const mMintSignerAta = getAssociatedTokenAddressSync(
    commonState.mMint,
    payer.publicKey,
    true,
    TOKEN_2022_PROGRAM_ID,
  );
  const mMintFeeReceiverAta = getAssociatedTokenAddressSync(
    commonState.mMint,
    commonState.feeReceiver,
    true,
    TOKEN_2022_PROGRAM_ID,
  );
  const paymentMintVaultAta = getAssociatedTokenAddressSync(
    feedAddr.token,
    getRedeemerVaultPda(vaultCommon),
    true,
    feedAddr.tokenProgram,
  );
  const paymentMintSignerAta = getAssociatedTokenAddressSync(
    feedAddr.token,
    payer.publicKey,
    true,
    feedAddr.tokenProgram,
  );

  const mMintSignerAtaInx = await createAtaIfNotExistsInx(
    provider.connection,
    commonState.mMint,
    payer.publicKey,
    payer,
    TOKEN_2022_PROGRAM_ID,
  );
  const mMintTokensReceiverAtaInx = await createAtaIfNotExistsInx(
    provider.connection,
    commonState.mMint,
    commonState.tokensReceiver,
    payer,
    TOKEN_2022_PROGRAM_ID,
  );
  const paymentMintVaultAtaInx = await createAtaIfNotExistsInx(
    provider.connection,
    feedAddr.token,
    getRedeemerVaultPda(vaultCommon),
    payer,
    feedAddr.tokenProgram,
  );
  const mMintFeeReceiverAtaInx = commonState.feeReceiver.equals(commonState.tokensReceiver)
    ? null
    : await createAtaIfNotExistsInx(
        provider.connection,
        commonState.mMint,
        commonState.feeReceiver,
        payer,
        TOKEN_2022_PROGRAM_ID,
      );

  // Pull Switchboard feeds if needed
  const isMFeedSwitchboard = 'switchboard' in mFeed.mode;
  const isPaymentFeedSwitchboard = 'switchboard' in paymentFeed.mode;

  if (isMFeedSwitchboard || isPaymentFeedSwitchboard) {
    const tx1 = new Transaction();

    if (isMFeedSwitchboard) {
      console.log('Pulling mToken Switchboard feed...');
      tx1.add(
        await getSwitchboardPullInx(
          provider,
          mFeed.underlyingFeed,
          network === 'mainnet' ? 'mainnet' : 'devnet',
        ),
      );
    }

    if (isPaymentFeedSwitchboard) {
      console.log('Pulling payment token Switchboard feed...');
      tx1.add(
        await getSwitchboardPullInx(
          provider,
          paymentFeed.underlyingFeed,
          network === 'mainnet' ? 'mainnet' : 'devnet',
        ),
      );
    }

    const txRes1 = await provider.sendAndConfirm(tx1, [], {
      commitment: 'finalized',
    });

    console.log('Switchboard feeds pulled:', txRes1);
  } else {
    console.log('No Switchboard feeds to pull, skipping feed update transaction');
  }

  const tx2 = new Transaction();

  // Add ATA creation instructions if needed
  if (mMintSignerAtaInx) {
    console.log('Creating mToken ATA for signer');
    tx2.add(mMintSignerAtaInx);
  }

  if (mMintTokensReceiverAtaInx) {
    console.log('Creating mToken ATA for tokens receiver');
    tx2.add(mMintTokensReceiverAtaInx);
  }

  if (mMintFeeReceiverAtaInx) {
    console.log('Creating mToken ATA for fee receiver');
    tx2.add(mMintFeeReceiverAtaInx);
  }

  if (paymentMintVaultAtaInx) {
    console.log('Creating payment token ATA for vault');
    tx2.add(paymentMintVaultAtaInx);
  }

  if (!acUser) {
    console.log('Creating access control account for user');
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
    console.log('Creating vault common account for user');
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
      .redeemInstant(toBN(amount), toBN(0))
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
        mMintFeeReceiverAta: mMintFeeReceiverAta,
        paymentMintVaultAta: paymentMintVaultAta,
        paymentMintSignerAta: paymentMintSignerAta,
        mMintSignerAta: mMintSignerAta,
      })
      .instruction(),
  );

  const txRes = await provider.sendAndConfirm(tx2, [], {
    commitment: 'finalized',
  });

  console.log(`✅ Redeem instant completed successfully`);
  console.log(`Transaction: ${txRes}`);
}

const network = getNetwork();
executeNetworkScript(network, main, 'local-wallet');
