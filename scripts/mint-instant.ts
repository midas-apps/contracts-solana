import { AnchorProvider } from '@coral-xyz/anchor';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';
import { Keypair, PublicKey, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';

import { addresses } from '@/common/addresses';
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

import { executeAnchorScript } from '../common/utils';

import { getAcProgram } from './deploy/contracts/ac';
import { getDataFeedProgram } from './deploy/contracts/dataFeed';
import { getSwitchboardPullInx } from './deploy/contracts/feeds/switchboard';
import { getVaultsProgram } from './deploy/contracts/vaults';

// TODO: change config before execution
const config = {
  product: 'mTBILL',
  mint: addresses['devnet'].feeds['usdc'].token,
  tokenProgram: addresses['devnet'].feeds['usdc'].tokenProgram,
  amount: parseUnits('100', 6),
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

  const vaultCommon = addresses[config.env][config.product].minter.commonVault;

  const commonState = await fetchVaultCommonState(vaultsProgram, vaultCommon);

  const vaultState = await fetchMinterVaultState(vaultsProgram, getMinterVaultPda(vaultCommon));

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

  const tx1 = new Transaction();

  tx1.add(await getSwitchboardPullInx(provider, mFeed.underlyingFeed, config.env));

  const txRes1 = await sendAndConfirmTransaction(provider.connection, tx1, [payer], {
    commitment: 'finalized',
  });

  console.log({ txRes1 });

  const tx2 = new Transaction();

  if (ata) {
    console.log('ata');
    tx2.add(ata);
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
      .mintInstant(toBN(config.amount), toBN(0), new Array(32).fill(0))
      .accountsPartial({
        vaultCommon: vaultCommon,
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
        tokenAuthority: vaultState.mintAuthorityPda,
        accountAc: getAccountAcStatePda(commonState.ac, payer.publicKey),
        vaultMinterRole: getAccountAcRoleStatePda(
          commonState.acRole,
          getMinterVaultPda(vaultCommon),
          TOKEN_AUTHORITY_ROLES.M_MINTER,
        ),
      })
      .instruction(),
  );

  const txRes = await sendAndConfirmTransaction(provider.connection, tx2, [payer], {
    commitment: 'finalized',
  });

  console.log({ txRes });
}

executeAnchorScript(main);
