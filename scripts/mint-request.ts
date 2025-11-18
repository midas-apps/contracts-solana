import { AnchorProvider } from '@coral-xyz/anchor';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { Keypair, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';

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
} from '@/test/helpers/vaults.helpers';

import { getAcProgram } from './deploy/ac';
import { getDataFeedProgram } from './deploy/dataFeed';
import { getSwitchboardPullInx } from './deploy/feeds/switchboard';
import { getVaultsProgram } from './deploy/vaults';
import { requireMinterVault, requirePaymentTokenFeed } from './utils/addressValidators';
import { getMtoken, getNetwork, getPaymentToken, getAmount } from './utils/argumentParser';

async function main(provider: AnchorProvider, payer: Keypair) {
  const mtoken = getMtoken();
  const network = getNetwork();
  const paymentToken = getPaymentToken();
  const amountStr = getAmount();

  console.log(`Minting ${mtoken} tokens for ${amountStr} ${paymentToken}`);

  // Get token addresses
  const vaultCommon = requireMinterVault(network, mtoken);

  // Get payment token feed address
  const feedAddr = requirePaymentTokenFeed(network, paymentToken, mtoken);

  // Parse amount
  const paymentTokenDecimals = 6;
  const amount = parseUnits(amountStr, paymentTokenDecimals);

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

  const paymentMintSignerAta = getAssociatedTokenAddressSync(
    feedAddr.token,
    payer.publicKey,
    true,
    feedAddr.tokenProgram,
  );
  const paymentMintTokensReceiverAta = getAssociatedTokenAddressSync(
    feedAddr.token,
    commonState.tokensReceiver,
    true,
    feedAddr.tokenProgram,
  );
  const paymentMintFeeReceiverAta = getAssociatedTokenAddressSync(
    feedAddr.token,
    commonState.feeReceiver,
    true,
    feedAddr.tokenProgram,
  );

  const paymentMintSignerAtaInx = await createAtaIfNotExistsInx(
    provider.connection,
    feedAddr.token,
    payer.publicKey,
    payer,
    feedAddr.tokenProgram,
  );
  const paymentMintTokensReceiverAtaInx = await createAtaIfNotExistsInx(
    provider.connection,
    feedAddr.token,
    commonState.tokensReceiver,
    payer,
    feedAddr.tokenProgram,
  );
  const paymentMintFeeReceiverAtaInx = commonState.feeReceiver.equals(commonState.tokensReceiver)
    ? null
    : await createAtaIfNotExistsInx(
        provider.connection,
        feedAddr.token,
        commonState.feeReceiver,
        payer,
        feedAddr.tokenProgram,
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

    const txRes1 = await sendAndConfirmTransaction(provider.connection, tx1, [payer], {
      commitment: 'finalized',
    });

    console.log('Switchboard feeds pulled:', txRes1);
  } else {
    console.log('No Switchboard feeds to pull, skipping feed update transaction');
  }

  const tx2 = new Transaction();

  // Add ATA creation instructions if needed
  if (paymentMintSignerAtaInx) {
    console.log('Creating payment token ATA for signer');
    tx2.add(paymentMintSignerAtaInx);
  }

  if (paymentMintTokensReceiverAtaInx) {
    console.log('Creating payment token ATA for tokens receiver');
    tx2.add(paymentMintTokensReceiverAtaInx);
  }

  if (paymentMintFeeReceiverAtaInx) {
    console.log('Creating payment token ATA for fee receiver');
    tx2.add(paymentMintFeeReceiverAtaInx);
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
      .mintRequest(toBN(amount), Array.from(payer.publicKey.toBytes()))
      .accountsPartial({
        vaultCommon: vaultCommon,
        ac: commonState.ac,
        mMintFeed: mFeed.underlyingFeed,
        mMintDataFeed: commonState.mMintFeed,
        signer: payer.publicKey,
        paymentMint: feedAddr.token,
        paymentMintDataFeed: payment.dataFeed,
        paymentMintFeed: paymentFeed.underlyingFeed,
        paymentMintTokenProgram: feedAddr.tokenProgram,
        accountAc: getAccountAcStatePda(commonState.ac, payer.publicKey),
        paymentMintSignerAta: paymentMintSignerAta,
        paymentMintTokensReceiverAta: paymentMintTokensReceiverAta,
        paymentMintFeeReceiverAta: paymentMintFeeReceiverAta,
      })
      .instruction(),
  );

  const txRes = await sendAndConfirmTransaction(provider.connection, tx2, [payer], {
    commitment: 'finalized',
  });

  console.log(`✅ Mint request completed successfully`);
  console.log(`Transaction: ${txRes}`);
}

const network = getNetwork();
executeNetworkScript(network, main);
