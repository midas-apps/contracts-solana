import {
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from '@solana/web3.js';
import { AnchorProvider } from '@coral-xyz/anchor';

import { executeAnchorScript } from '../common/utils';
import {
  createAtaIfNotExistsInx,
  parseUnits,
  toBN,
} from '@/test/helpers/common.helpers';
import { getVaultsProgram } from './deploy/common/vaults';
import {
  fetchAccountAcState,
  getAccountAcStatePda,
} from '@/test/helpers/ac.helpers';
import {
  fetchPaymentMintState,
  fetchRedeemerVaultState,
  fetchVaultCommonAccountState,
  fetchVaultCommonState,
  getCommonVaultAccountStatePda,
  getPaymentMintStatePda,
  getRedeemerVaultPda,
} from '@/test/helpers/vaults.helpers';
import { addresses } from '@/common/addresses';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { fetchDataFeedState } from '@/test/helpers/data-feed.helpers';
import { getDataFeedProgram } from './deploy/common/common';
import { getAcProgram } from './deploy/common/ac';

// TODO: change config before execution
const config = {
  product: 'mTBILL',
  mint: addresses['devnet'].feeds['usdc'].token,
  tokenProgram: addresses['devnet'].feeds['usdc'].tokenProgram,
  amount: parseUnits('10', 9),
  env: 'devnet',
} as {
  product: 'mTBILL';
  env: 'devnet' | 'mainnet';
  mint: PublicKey;
  amount: bigint;
  tokenProgram?: PublicKey;
};

async function main(provider: AnchorProvider, payer: Keypair) {
  const vaultsProgram = getVaultsProgram(provider);
  const feedProgram = getDataFeedProgram(provider);
  const acProgram = getAcProgram(provider);

  const vaultCommon =
    addresses[config.env][config.product].redeemer.commonVault;

  const commonState = await fetchVaultCommonState(vaultsProgram, vaultCommon);

  const vaultState = await fetchRedeemerVaultState(
    vaultsProgram,
    getRedeemerVaultPda(vaultCommon),
  );

  const mFeed = await fetchDataFeedState(feedProgram, commonState.mMintFeed);
  const payment = await fetchPaymentMintState(
    vaultsProgram,
    getPaymentMintStatePda(vaultCommon, config.mint),
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
    config.mint,
    getRedeemerVaultPda(vaultCommon),
    payer,
    config.tokenProgram,
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
      .redeemInstant(toBN(config.amount), toBN(0))
      .accountsPartial({
        vaultCommon: vaultCommon,
        redeemerVault: getRedeemerVaultPda(vaultCommon),
        ac: commonState.ac,
        mMint: commonState.mMint,
        mMintFeed: mFeed.underlyingFeed,
        mMintTokenProgram: TOKEN_2022_PROGRAM_ID,
        mMintDataFeed: commonState.mMintFeed,
        signer: payer.publicKey,
        paymentMint: config.mint,
        paymentMintDataFeed: payment.dataFeed,
        paymentMintFeed: paymentFeed.underlyingFeed,
        paymentMintTokenProgram: config.tokenProgram,
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
}

executeAnchorScript(main);
