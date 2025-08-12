import { fetchVaultCommonState } from '@/test/helpers/vaults.helpers';
import { CommonParams } from './common';
import { getVaultsProgram } from './vaults';
import { getAddresses } from '@/common/addresses';
import { MTokenName, PaymentTokenName } from '@/common/types/tokens';

import { sendAndConfirmTransaction, Transaction } from '@solana/web3.js';

import { createAtaIfNotExistsInx, toBN } from '@/test/helpers/common.helpers';
import { getAccountAcRoleStatePda } from '@/test/helpers/ac.helpers';
import { VAULT_AC_ROLES } from '@/test/constants/vaults.constants';
import { getDeploymentGenericConfig, getNetworkConfig } from './utils';

export const addPaymentToken = async (
  { provider, payer }: CommonParams,
  mtoken: MTokenName,
  ptoken: PaymentTokenName,
) => {
  const vaultsProgram = getVaultsProgram(provider);

  const addresses = getAddresses(provider.network);

  const tokenAddresses = addresses[mtoken];

  const tokenFeed = addresses.feeds[ptoken];

  const { addPaymentTokens: networkConfig } = getNetworkConfig(
    provider.network,
    mtoken,
    'postDeploy',
  );

  const commonState = await fetchVaultCommonState(
    vaultsProgram,
    tokenAddresses.redeemer.commonVault,
  );

  const tx = new Transaction().add(
    config.isFiat
      ? await vaultsProgram.methods
          .addPaymentTokenFiat(toBN(config.fee), toBN(config.allowance))
          .accountsPartial({
            authority: payer.publicKey,
            vaultCommon: tokenAddresses.redeemer.commonVault,
            authorityAcRole: getAccountAcRoleStatePda(
              commonState.acRole,
              payer.publicKey,
              VAULT_AC_ROLES.VAULT_ADMIN,
            ),
          })
          .instruction()
      : await vaultsProgram.methods
          .addPaymentToken(
            toBN(config.fee),
            toBN(config.allowance),
            config.stable,
          )
          .accountsPartial({
            authority: payer.publicKey,
            tokenProgram: tokenFeed.tokenProgram,
            vaultCommon: tokenAddresses.redeemer.commonVault,
            dataFeed: tokenFeed.dataFeed,
            paymentMint: tokenFeed.token,
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
      tokenFeed.token,
      commonState.feeReceiver,
      payer,
      tokenFeed.tokenProgram,
    );

    const tokensReceiverCreateAtaInx = commonState.tokensReceiver.equals(
      commonState.feeReceiver,
    )
      ? null
      : await createAtaIfNotExistsInx(
          provider.connection,
          tokenFeed.token,
          commonState.tokensReceiver,
          payer,
          tokenFeed.tokenProgram,
        );

    if (feeReceiverCreateAtaInx) {
      tx.add(feeReceiverCreateAtaInx);
    }

    if (tokensReceiverCreateAtaInx) {
      tx.add(tokensReceiverCreateAtaInx);
    }
  }
  const txRes = await sendAndConfirmTransaction(
    provider.connection,
    tx,
    [payer],
    {
      commitment: 'finalized',
    },
  );

  console.log({ txRes });
};
