import { AnchorProvider } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Keypair, PublicKey, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';

import { addresses } from '@/common/addresses';
import { MProduct } from '@/common/tokenTypes';
import { MAX_U128 } from '@/test/constants/common.constants';
import { VAULT_AC_ROLES } from '@/test/constants/vaults.constants';
import { getAccountAcRoleStatePda } from '@/test/helpers/ac.helpers';
import { createAtaIfNotExistsInx, parsePercent, toBN } from '@/test/helpers/common.helpers';
import { fetchVaultCommonState } from '@/test/helpers/vaults.helpers';

import { executeNetworkScript } from '../common/utils';

import { getVaultsProgram } from './deploy/contracts/vaults';
import { getNetwork } from './utils/argumentParser';

async function main(provider: AnchorProvider, payer: Keypair) {
  const network = getNetwork();

  // TODO: change config before execution
  const config = {
    vaultCommon: addresses[network].tokens[MProduct.MTBILL].redeemer.commonVault,
    allowance: MAX_U128,
    fee: parsePercent(0.1),
    feed: addresses[network].feeds['usdc'].dataFeed,
    mint: addresses[network].feeds['usdc'].token,
    tokenProgram: TOKEN_PROGRAM_ID,
    stable: true,
    isFiat: false,
  } as {
    mint: PublicKey;
    vaultCommon: PublicKey;
    feed: PublicKey;
    tokenProgram?: PublicKey;
    fee: bigint;
    allowance: bigint;
    stable: boolean;
    isFiat?: boolean;
  };
  const vaultsProgram = getVaultsProgram(provider);

  const commonState = await fetchVaultCommonState(vaultsProgram, config.vaultCommon);

  const tx = new Transaction().add(
    config.isFiat
      ? await vaultsProgram.methods
          .addPaymentTokenFiat(toBN(config.fee), toBN(config.allowance))
          .accountsPartial({
            authority: payer.publicKey,
            vaultCommon: config.vaultCommon,
            authorityAcRole: getAccountAcRoleStatePda(
              commonState.acRole,
              payer.publicKey,
              VAULT_AC_ROLES.VAULT_ADMIN,
            ),
          })
          .instruction()
      : await vaultsProgram.methods
          .addPaymentToken(toBN(config.fee), toBN(config.allowance), config.stable)
          .accountsPartial({
            authority: payer.publicKey,
            tokenProgram: config.tokenProgram,
            vaultCommon: config.vaultCommon,
            dataFeed: config.feed,
            paymentMint: config.mint,
            authorityAcRole: getAccountAcRoleStatePda(
              commonState.acRole,
              payer.publicKey,
              VAULT_AC_ROLES.VAULT_ADMIN,
            ),
          })
          .instruction(),
  );

  if (!config.isFiat) {
    const feeReceiverCreateAtaInx = await createAtaIfNotExistsInx(
      provider.connection,
      config.mint,
      commonState.feeReceiver,
      payer,
      config.tokenProgram,
    );

    const tokensReceiverCreateAtaInx = commonState.tokensReceiver.equals(commonState.feeReceiver)
      ? null
      : await createAtaIfNotExistsInx(
          provider.connection,
          config.mint,
          commonState.tokensReceiver,
          payer,
          config.tokenProgram,
        );

    if (feeReceiverCreateAtaInx) {
      tx.add(feeReceiverCreateAtaInx);
    }

    if (tokensReceiverCreateAtaInx) {
      tx.add(tokensReceiverCreateAtaInx);
    }
  }
  const txRes = await sendAndConfirmTransaction(provider.connection, tx, [payer], {
    commitment: 'finalized',
  });

  console.log({ txRes });
}

const network = getNetwork();
executeNetworkScript(network, main);
