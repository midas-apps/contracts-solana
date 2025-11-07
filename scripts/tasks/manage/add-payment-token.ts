import { AnchorProvider } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Keypair, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';

import { PaymentToken, isPaymentToken } from '@/common/tokenTypes';
import { executeNetworkScript } from '@/common/utils';
import { MAX_U128 } from '@/test/constants/common.constants';
import { VAULT_AC_ROLES } from '@/test/constants/vaults.constants';
import { getAccountAcRoleStatePda } from '@/test/helpers/ac.helpers';
import {
  createAtaIfNotExistsInx,
  toBN,
  parsePercent,
  parseUnits,
} from '@/test/helpers/common.helpers';
import { fetchVaultCommonState } from '@/test/helpers/vaults.helpers';

import { loadTokenConfig } from '../../configs/loadTokenConfig';
import { getVaultsProgram } from '../../deploy/contracts/vaults';
import { getFeedAddresses, getTokenAddresses } from '../../utils/addressManager';
import { parsePaymentTokenArgs } from '../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Keypair) {
  const args = parsePaymentTokenArgs();

  console.log(`╔════════════════════════════════════════════════╗`);
  console.log(`║        Add Payment Token Script               ║`);
  console.log(`╚════════════════════════════════════════════════╝`);
  console.log(`Token: ${args.mtoken}`);
  console.log(`Payment Token: ${args.paymentToken}`);
  console.log(`Network: ${args.network}`);
  console.log(`Deployer: ${payer.publicKey.toString()}`);
  console.log('');

  // Load configuration (with cross-reference validation for payment tokens)
  console.log('Loading configuration...');
  const config = loadTokenConfig(args.mtoken, args.network);
  console.log('✓ Configuration loaded');

  // Get token addresses
  const tokenAddrs = getTokenAddresses(args.network, args.mtoken);
  if (!tokenAddrs?.redeemer?.commonVault) {
    throw new Error(`Redeemer vault not found for ${args.mtoken} on ${args.network}`);
  }

  // Get payment token feed address
  if (!isPaymentToken(args.paymentToken)) {
    throw new Error(
      `Invalid payment token '${
        args.paymentToken
      }'. Must be one of: ${Object.values(PaymentToken).join(', ')}`,
    );
  }
  const feedAddr = getFeedAddresses(args.network, args.paymentToken);
  if (!feedAddr?.dataFeed) {
    throw new Error(`Feed not found for payment token ${args.paymentToken} on ${args.network}`);
  }

  if (!feedAddr.token) {
    throw new Error(
      `Token mint not found for payment token ${args.paymentToken} on ${args.network}`,
    );
  }

  // Get payment token config from token config or use CLI args
  const paymentTokenConfig = config.paymentTokens?.find(
    (pt) => pt.symbol.toLowerCase() === args.paymentToken.toLowerCase(),
  );

  const fee = args.fee || paymentTokenConfig?.fee || '0.1';
  const allowance = args.allowance || paymentTokenConfig?.allowance || MAX_U128.toString();
  const stable = args.stable !== undefined ? args.stable : paymentTokenConfig?.stable || false;
  const isFiat = args.isFiat !== undefined ? args.isFiat : paymentTokenConfig?.isFiat || false;

  const vaultsProgram = getVaultsProgram(provider);
  const commonState = await fetchVaultCommonState(vaultsProgram, tokenAddrs.redeemer.commonVault);

  const tx = new Transaction().add(
    isFiat
      ? await vaultsProgram.methods
          .addPaymentTokenFiat(toBN(parsePercent(parseFloat(fee))), toBN(parseUnits(allowance)))
          .accountsPartial({
            authority: payer.publicKey,
            vaultCommon: tokenAddrs.redeemer.commonVault,
            authorityAcRole: getAccountAcRoleStatePda(
              commonState.acRole,
              payer.publicKey,
              VAULT_AC_ROLES.VAULT_ADMIN,
            ),
          })
          .instruction()
      : await vaultsProgram.methods
          .addPaymentToken(toBN(parsePercent(parseFloat(fee))), toBN(parseUnits(allowance)), stable)
          .accountsPartial({
            authority: payer.publicKey,
            tokenProgram: feedAddr.tokenProgram || TOKEN_PROGRAM_ID,
            vaultCommon: tokenAddrs.redeemer.commonVault,
            dataFeed: feedAddr.dataFeed,
            paymentMint: feedAddr.token,
            authorityAcRole: getAccountAcRoleStatePda(
              commonState.acRole,
              payer.publicKey,
              VAULT_AC_ROLES.VAULT_ADMIN,
            ),
          })
          .instruction(),
  );

  if (!isFiat) {
    const feeReceiverCreateAtaInx = await createAtaIfNotExistsInx(
      provider.connection,
      feedAddr.token,
      commonState.feeReceiver,
      payer,
      feedAddr.tokenProgram || TOKEN_PROGRAM_ID,
    );

    const tokensReceiverCreateAtaInx = commonState.tokensReceiver.equals(commonState.feeReceiver)
      ? null
      : await createAtaIfNotExistsInx(
          provider.connection,
          feedAddr.token,
          commonState.tokensReceiver,
          payer,
          feedAddr.tokenProgram || TOKEN_PROGRAM_ID,
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

  console.log(`✅ Payment token ${args.paymentToken} added successfully!`);
  console.log(`Transaction: ${txRes}`);
}

const args = parsePaymentTokenArgs();
executeNetworkScript(args.network, main);
