import { MTokenName, PaymentTokenName } from '@/common/types/tokens';
import { CommonParams, getDataFeedProgram } from './common';
import { getAddresses } from '@/common/addresses';
import { getAcProgram } from './ac';
import { getVaultsProgram } from './vaults';
import {
  fetchPaymentMintState,
  fetchRedeemerVaultState,
  fetchVaultCommonAccountState,
  fetchVaultCommonState,
  getCommonVaultAccountStatePda,
  getPaymentMintStatePda,
  getRedeemerVaultPda,
} from '@/test/helpers/vaults.helpers';
import { fetchDataFeedState } from '@/test/helpers/data-feed.helpers';
import {
  fetchAccountAcState,
  getAccountAcStatePda,
} from '@/test/helpers/ac.helpers';
import { createAtaIfNotExistsInx, toBN } from '@/test/helpers/common.helpers';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { sendAndConfirmTransaction, Transaction } from '@solana/web3.js';

export const redeemInstant = async (
  { provider, payer }: CommonParams,
  mToken: MTokenName,
  pToken: PaymentTokenName,
  amount: string,
) => {
  const addresses = getAddresses(provider.network);

  const vaultsProgram = getVaultsProgram(provider);
  const feedProgram = getDataFeedProgram(provider);
  const acProgram = getAcProgram(provider);

  const { token: mint, tokenProgram } = addresses.feeds[pToken];

  const vaultCommon = addresses[mToken].redeemer.commonVault;
  const commonState = await fetchVaultCommonState(vaultsProgram, vaultCommon);

  const vaultState = await fetchRedeemerVaultState(
    vaultsProgram,
    getRedeemerVaultPda(vaultCommon),
  );

  const mFeed = await fetchDataFeedState(feedProgram, commonState.mMintFeed);
  const payment = await fetchPaymentMintState(
    vaultsProgram,
    getPaymentMintStatePda(vaultCommon, mint),
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

  const ataVault = await createAtaIfNotExistsInx(
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
    mint,
    getRedeemerVaultPda(vaultCommon),
    payer,
    tokenProgram,
  );

  const ataFeeReceiver = commonState.feeReceiver.equals(
    commonState.tokensReceiver,
  )
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
          vaultCommonAccount: getCommonVaultAccountStatePda(
            vaultCommon,
            payer.publicKey,
          ),
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
        paymentMint: mint,
        paymentMintDataFeed: payment.dataFeed,
        paymentMintFeed: paymentFeed.underlyingFeed,
        paymentMintTokenProgram: tokenProgram,
        accountAc: getAccountAcStatePda(commonState.ac, payer.publicKey),
      })
      .instruction(),
  );

  const txRes = await sendAndConfirmTransaction(
    provider.connection,
    tx2,
    [payer],
    {
      commitment: 'finalized',
    },
  );

  console.log({ txRes });
};

export const redeemRequestFiat = async (
  { provider, payer }: CommonParams,
  mToken: MTokenName,
  pToken: PaymentTokenName,
  amount: string,
) => {
  const addresses = getAddresses(provider.network);

  const vaultsProgram = getVaultsProgram(provider);
  const feedProgram = getDataFeedProgram(provider);
  const acProgram = getAcProgram(provider);

  const { token: mint, tokenProgram } = addresses.feeds[pToken];

  const vaultCommon = addresses[mToken].redeemer.commonVault;
  const commonState = await fetchVaultCommonState(vaultsProgram, vaultCommon);

  const vaultState = await fetchRedeemerVaultState(
    vaultsProgram,
    getRedeemerVaultPda(vaultCommon),
  );

  const mFeed = await fetchDataFeedState(feedProgram, commonState.mMintFeed);
  const payment = await fetchPaymentMintState(
    vaultsProgram,
    getPaymentMintStatePda(vaultCommon, mint),
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

  const ataVault = await createAtaIfNotExistsInx(
    provider.connection,
    commonState.mMint,
    getRedeemerVaultPda(vaultCommon),
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
    mint,
    getRedeemerVaultPda(vaultCommon),
    payer,
    tokenProgram,
  );

  const vaultCreateMMinAtaInx = await createAtaIfNotExistsInx(
    provider.connection,
    commonState.mMint,
    getRedeemerVaultPda(vaultCommon),
    payer,
    TOKEN_2022_PROGRAM_ID,
  );

  const ataFeeReceiver = commonState.feeReceiver.equals(
    commonState.tokensReceiver,
  )
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
          vaultCommonAccount: getCommonVaultAccountStatePda(
            vaultCommon,
            payer.publicKey,
          ),
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

  const txRes = await sendAndConfirmTransaction(
    provider.connection,
    tx2,
    [payer],
    {
      commitment: 'finalized',
    },
  );

  console.log({ txRes });
};

export const redeemRequest = async (
  { provider, payer }: CommonParams,
  mToken: MTokenName,
  pToken: PaymentTokenName,
  amount: string,
) => {
  const addresses = getAddresses(provider.network);

  const vaultsProgram = getVaultsProgram(provider);
  const feedProgram = getDataFeedProgram(provider);
  const acProgram = getAcProgram(provider);

  const { token: mint, tokenProgram } = addresses.feeds[pToken];

  const vaultCommon = addresses[mToken].redeemer.commonVault;
  const commonState = await fetchVaultCommonState(vaultsProgram, vaultCommon);

  const vaultState = await fetchRedeemerVaultState(
    vaultsProgram,
    getRedeemerVaultPda(vaultCommon),
  );

  const mFeed = await fetchDataFeedState(feedProgram, commonState.mMintFeed);
  const payment = await fetchPaymentMintState(
    vaultsProgram,
    getPaymentMintStatePda(vaultCommon, mint),
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

  const ataVault = await createAtaIfNotExistsInx(
    provider.connection,
    commonState.mMint,
    getRedeemerVaultPda(vaultCommon),
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
    mint,
    getRedeemerVaultPda(vaultCommon),
    payer,
    tokenProgram,
  );

  const vaultCreateMMinAtaInx = await createAtaIfNotExistsInx(
    provider.connection,
    commonState.mMint,
    getRedeemerVaultPda(vaultCommon),
    payer,
    TOKEN_2022_PROGRAM_ID,
  );

  const ataFeeReceiver = commonState.feeReceiver.equals(
    commonState.tokensReceiver,
  )
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
          vaultCommonAccount: getCommonVaultAccountStatePda(
            vaultCommon,
            payer.publicKey,
          ),
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
        paymentMint: mint,
        paymentMintDataFeed: payment.dataFeed,
        paymentMintFeed: paymentFeed.underlyingFeed,
        paymentMintTokenProgram: tokenProgram,
        accountAc: getAccountAcStatePda(commonState.ac, payer.publicKey),
      })
      .instruction(),
  );

  const txRes = await sendAndConfirmTransaction(
    provider.connection,
    tx2,
    [payer],
    {
      commitment: 'finalized',
    },
  );

  console.log({ txRes });
};
