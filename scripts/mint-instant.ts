import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { Transaction } from '@solana/web3.js';

import { executeNetworkScript } from '@/common/scriptRunner';
import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';
import { TOKEN_AUTHORITY_ROLES } from '@/test/constants/token-authority.constants';
import {
  fetchAccountAcState,
  getAccountAcRoleStatePda,
  getAccountAcStatePda,
} from '@/test/helpers/ac.helpers';
import { createAtaIfNotExistsInx, parseUnits, toBN } from '@/test/helpers/common.helpers';
import { fetchDataFeedState } from '@/test/helpers/data-feed.helpers';
import {
  fetchMinterVaultState,
  fetchPaymentMintState,
  fetchVaultCommonAccountState,
  fetchVaultCommonState,
  getCommonVaultAccountStatePda,
  getMinterVaultPda,
  getPaymentMintStatePda,
} from '@/test/helpers/vaults.helpers';

import { getAcProgram } from './deploy/ac';
import { getDataFeedProgram } from './deploy/dataFeed';
import { getVaultsProgram } from './deploy/vaults';
import { requireMinterVault, requirePaymentTokenFeed } from './utils/addressValidators';
import { getMtoken, getNetwork, getPaymentToken, getAmount } from './utils/argumentParser';
import { pullSwitchboardFeeds } from './utils/switchboardHelpers';

async function main(provider: AnchorProvider, payer: Wallet) {
  const mtoken = getMtoken();
  const network = getNetwork();
  const paymentToken = getPaymentToken();
  const amountStr = getAmount();

  console.log(`Minting ${mtoken} tokens instantly for ${amountStr} ${paymentToken}`);

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

  const vaultState = await fetchMinterVaultState(vaultsProgram, getMinterVaultPda(vaultCommon));

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

  const mMintSignerAtaInx = await createAtaIfNotExistsInx(
    provider.connection,
    commonState.mMint,
    payer.publicKey,
    payer,
    TOKEN_2022_PROGRAM_ID,
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

  // Pull Switchboard feeds if stale
  await pullSwitchboardFeeds(
    provider,
    [
      {
        feed: mFeed.underlyingFeed,
        isSwitchboard: 'switchboard' in mFeed.mode,
        maxStalenessSeconds: mFeed.maxStaleness,
      },
      {
        feed: paymentFeed.underlyingFeed,
        isSwitchboard: 'switchboard' in paymentFeed.mode,
        maxStalenessSeconds: paymentFeed.maxStaleness,
      },
    ],
    network,
  );

  const tx2 = new Transaction();

  // Add ATA creation instructions if needed
  if (mMintSignerAtaInx) {
    console.log('Creating mToken ATA for signer');
    tx2.add(mMintSignerAtaInx);
  }

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
      .mintInstant(toBN(amount), toBN(0), new Array(32).fill(0))
      .accountsPartial({
        vaultCommon: vaultCommon,
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
        tokenAuthority: vaultState.mintAuthorityPda,
        accountAc: getAccountAcStatePda(commonState.ac, payer.publicKey),
        vaultMinterRole: getAccountAcRoleStatePda(
          commonState.acRole,
          getMinterVaultPda(vaultCommon),
          TOKEN_AUTHORITY_ROLES.M_MINTER,
        ),
        paymentMintSignerAta: paymentMintSignerAta,
        paymentMintTokensReceiverAta: paymentMintTokensReceiverAta,
        paymentMintFeeReceiverAta: paymentMintFeeReceiverAta,
        mMintSignerAta: mMintSignerAta,
      })
      .instruction(),
  );

  const result = await sendAndWaitForCustomSolanaTxSign(provider, tx2, [], {});

  console.log(`✅ Mint instant completed successfully`);
  console.log(`Transaction: ${result.signature}`);
}

const network = getNetwork();
executeNetworkScript(network, main);
