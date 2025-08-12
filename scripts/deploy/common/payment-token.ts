import { fetchVaultCommonState } from '@/test/helpers/vaults.helpers';
import { CommonParams } from './common';
import { getVaultsProgram, mapVaultTypeToAddressKey } from './vaults';
import { getAddresses } from '@/common/addresses';
import { MTokenName, PaymentTokenName } from '@/common/types/tokens';

import { sendAndConfirmTransaction, Transaction } from '@solana/web3.js';

import { createAtaIfNotExistsInx, toBN } from '@/test/helpers/common.helpers';
import { getAccountAcRoleStatePda } from '@/test/helpers/ac.helpers';
import { VAULT_AC_ROLES } from '@/test/constants/vaults.constants';
import { getNetworkConfig } from './utils';

export const addPaymentToken = async (
  { provider, payer }: CommonParams,
  mtoken: MTokenName,
) => {
  const vaultsProgram = getVaultsProgram(provider);

  const addresses = getAddresses(provider.network);

  const tokenAddresses = addresses[mtoken];

  const { addPaymentTokens: config } = getNetworkConfig(
    provider.network,
    mtoken,
    'postDeploy',
  );

  for (const vault of config.vaults) {
    const commonVaultAddress =
      tokenAddresses[mapVaultTypeToAddressKey(vault.type)].commonVault; // TODO: REVIEW THIS

    const commonState = await fetchVaultCommonState(
      vaultsProgram,
      commonVaultAddress,
    );

    for (const paymentToken of vault.paymentTokens) {
      const tokenFeed = addresses.feeds[paymentToken.token];

      const tx = new Transaction().add(
        paymentToken.isFiat
          ? await vaultsProgram.methods
              .addPaymentTokenFiat(
                toBN(paymentToken.fee),
                toBN(paymentToken.allowance),
              )
              .accountsPartial({
                authority: payer.publicKey,
                vaultCommon: commonVaultAddress,
                authorityAcRole: getAccountAcRoleStatePda(
                  commonState.acRole,
                  payer.publicKey,
                  VAULT_AC_ROLES.VAULT_ADMIN,
                ),
              })
              .instruction()
          : await vaultsProgram.methods
              .addPaymentToken(
                toBN(paymentToken.fee),
                toBN(paymentToken.allowance),
                paymentToken.isStable,
              )
              .accountsPartial({
                authority: payer.publicKey,
                tokenProgram: tokenFeed.tokenProgram,
                vaultCommon: commonVaultAddress,
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

      if (!paymentToken.isFiat) {
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
    }
  }
};
