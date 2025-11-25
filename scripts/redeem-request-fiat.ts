import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { Transaction } from '@solana/web3.js';

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

import { getAcProgram } from './deploy/ac';
import { getDataFeedProgram } from './deploy/dataFeed';
import { getSwitchboardPullInx } from './deploy/feeds/switchboard';
import { getVaultsProgram } from './deploy/vaults';
import { requireRedeemerVault } from './utils/addressValidators';
import { getMtoken, getNetwork, getAmount } from './utils/argumentParser';

async function main(provider: AnchorProvider, payer: Wallet) {
  const mtoken = getMtoken();
  const network = getNetwork();
  const amountStr = getAmount();

  console.log(`Redeeming ${amountStr} ${mtoken} tokens`);

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

  const mMintSignerAta = getAssociatedTokenAddressSync(
    commonState.mMint,
    payer.publicKey,
    true,
    TOKEN_2022_PROGRAM_ID,
  );
  const mMintVaultAta = getAssociatedTokenAddressSync(
    commonState.mMint,
    getRedeemerVaultPda(vaultCommon),
    true,
    TOKEN_2022_PROGRAM_ID,
  );
  const mMintFeeReceiverAta = getAssociatedTokenAddressSync(
    commonState.mMint,
    commonState.feeReceiver,
    true,
    TOKEN_2022_PROGRAM_ID,
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
  const mMintVaultAtaInx = await createAtaIfNotExistsInx(
    provider.connection,
    commonState.mMint,
    getRedeemerVaultPda(vaultCommon),
    payer,
    TOKEN_2022_PROGRAM_ID,
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

  // Pull Switchboard feeds if needed (only mFeed for fiat redemption)
  const isMFeedSwitchboard = 'switchboard' in mFeed.mode;

  if (isMFeedSwitchboard) {
    const tx1 = new Transaction();

    console.log('Pulling mToken Switchboard feed...');
    tx1.add(
      await getSwitchboardPullInx(
        provider,
        mFeed.underlyingFeed,
        network === 'mainnet' ? 'mainnet' : 'devnet',
      ),
    );

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

  if (mMintVaultAtaInx) {
    console.log('Creating mToken ATA for vault');
    tx2.add(mMintVaultAtaInx);
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
        mMintVaultAta: mMintVaultAta,
        mMintFeeReceiverAta: mMintFeeReceiverAta,
        mMintSignerAta: mMintSignerAta,
      })
      .instruction(),
  );

  const txRes = await provider.sendAndConfirm(tx2, [], {
    commitment: 'finalized',
  });

  console.log(`✅ Redeem request fiat completed successfully`);
  console.log(`Transaction: ${txRes}`);
}

const network = getNetwork();
executeNetworkScript(network, main);
