import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey, Transaction } from '@solana/web3.js';

import { executeNetworkScript } from '@/common/scriptRunner';
import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';
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
import { getVaultsProgram } from '../../deploy/vaults';
import { getTokenAddresses } from '../../utils/addressQueries';
import {
  requireMinterVault,
  requireRedeemerVault,
  requirePaymentTokenFeed,
} from '../../utils/addressValidators';
import {
  getMtoken,
  getNetwork,
  getOptionalArg,
  getOptionalVaults,
} from '../../utils/argumentParser';

type VaultType = 'minter' | 'redeemer';

async function addPaymentTokenToVault(
  provider: AnchorProvider,
  payer: Wallet,
  network: string,
  vaultsProgram: ReturnType<typeof getVaultsProgram>,
  vaultCommon: PublicKey,
  feedAddr: { token: PublicKey; dataFeed: PublicKey; tokenProgram: PublicKey } | null,
  finalFee: string,
  finalAllowance: string,
  finalStable: boolean,
  finalIsFiat: boolean,
  paymentToken: string,
  mtoken: string,
): Promise<string> {
  const commonState = await fetchVaultCommonState(vaultsProgram, vaultCommon);

  if (!feedAddr && !finalIsFiat) {
    throw new Error('Feed address is required for non-fiat payment tokens');
  }

  const tx = new Transaction().add(
    finalIsFiat
      ? await vaultsProgram.methods
          .addPaymentTokenFiat(
            toBN(parsePercent(parseFloat(finalFee))),
            toBN(parseUnits(finalAllowance)),
          )
          .accountsPartial({
            authority: payer.publicKey,
            vaultCommon: vaultCommon,
            authorityAcRole: getAccountAcRoleStatePda(
              commonState.acRole,
              payer.publicKey,
              VAULT_AC_ROLES.VAULT_ADMIN,
            ),
          })
          .instruction()
      : await vaultsProgram.methods
          .addPaymentToken(
            toBN(parsePercent(parseFloat(finalFee))),
            toBN(parseUnits(finalAllowance)),
            finalStable,
          )
          .accountsPartial({
            authority: payer.publicKey,
            tokenProgram: feedAddr!.tokenProgram || TOKEN_PROGRAM_ID,
            vaultCommon: vaultCommon,
            dataFeed: feedAddr!.dataFeed,
            paymentMint: feedAddr!.token,
            authorityAcRole: getAccountAcRoleStatePda(
              commonState.acRole,
              payer.publicKey,
              VAULT_AC_ROLES.VAULT_ADMIN,
            ),
          })
          .instruction(),
  );

  if (!finalIsFiat && feedAddr) {
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

  const txResult = await sendAndWaitForCustomSolanaTxSign(provider, tx, [], {
    action: 'update-vault',
    comment: `Add ${paymentToken} payment token to ${mtoken} vault`,
    mToken: mtoken,
    waitForTx: true,
  });

  return txResult.signature || '';
}

async function main(provider: AnchorProvider, payer: Wallet) {
  const mtoken = getMtoken();
  const network = getNetwork();
  const specificPaymentToken = getOptionalArg('payment-token') || getOptionalArg('p');
  const cliVaults = getOptionalVaults();

  if (specificPaymentToken) {
    console.log(`Adding ${specificPaymentToken} as payment token for ${mtoken}`);
  } else {
    console.log(`Adding all configured payment tokens for ${mtoken}`);
  }

  // Load configuration (with cross-reference validation for payment tokens)
  console.log('Loading configuration...');
  const config = loadTokenConfig(mtoken, network);
  console.log('✓ Configuration loaded');

  // Get token addresses
  const tokenAddrs = getTokenAddresses(network, mtoken);
  if (!tokenAddrs) {
    throw new Error(`Token addresses not found for ${mtoken} on ${network}`);
  }

  // Determine target vaults: CLI overrides default (both vaults)
  const targetVaults: VaultType[] = cliVaults || (['minter', 'redeemer'] as VaultType[]);

  console.log(`Target vaults: ${targetVaults.join(', ')}`);

  // Validate vaults exist
  if (targetVaults.includes('minter')) {
    requireMinterVault(network, mtoken);
  }
  if (targetVaults.includes('redeemer')) {
    requireRedeemerVault(network, mtoken);
  }

  const vaultsProgram = getVaultsProgram(provider);

  // Collect all unique payment tokens from target vaults
  const paymentTokensToAdd = new Set<string>();

  if (specificPaymentToken) {
    // Add specific token if provided
    paymentTokensToAdd.add(specificPaymentToken);
  } else {
    // Collect all payment tokens from all target vaults
    for (const vaultType of targetVaults) {
      const vaultConfig = vaultType === 'minter' ? config.minter : config.redeemer;
      vaultConfig.paymentTokens?.forEach((pt) => paymentTokensToAdd.add(pt.symbol));
    }
  }

  if (paymentTokensToAdd.size === 0) {
    console.log('⚠️  No payment tokens configured for the specified vault(s)');
    return;
  }

  console.log(`Payment tokens to add: ${Array.from(paymentTokensToAdd).join(', ')}`);

  // Add each payment token to each target vault
  const results: { vault: VaultType; paymentToken: string; tx: string }[] = [];

  for (const paymentToken of paymentTokensToAdd) {
    console.log(`\n💰 ${paymentToken}:`);

    for (const vaultType of targetVaults) {
      const vaultCommon =
        vaultType === 'minter' ? tokenAddrs.minter?.commonVault : tokenAddrs.redeemer?.commonVault;

      if (!vaultCommon) {
        throw new Error(`${vaultType} vault not found for ${mtoken} on ${network}`);
      }

      // Find payment token config for this specific vault
      const vaultConfig = vaultType === 'minter' ? config.minter : config.redeemer;
      const paymentTokenConfig = vaultConfig.paymentTokens?.find(
        (pt) => pt.symbol.toLowerCase() === paymentToken.toLowerCase(),
      );

      if (!paymentTokenConfig) {
        console.log(`   ⏭️  ${vaultType}: not configured`);
        continue;
      }

      // Get payment token config values (all come from config only)
      const finalFee = paymentTokenConfig.fee;
      const finalAllowance = paymentTokenConfig.allowance;
      const finalStable = paymentTokenConfig.stable;
      const finalIsFiat = paymentTokenConfig.isFiat ?? false;

      // Get payment token feed address from common/addresses.ts (only for non-fiat tokens)
      // Fiat tokens use FIAT_MINT (zero address) and don't have addresses in common/addresses.ts
      let feedAddr: { token: PublicKey; dataFeed: PublicKey; tokenProgram: PublicKey } | null =
        null;
      if (!finalIsFiat) {
        try {
          feedAddr = requirePaymentTokenFeed(network, paymentTokenConfig.symbol, mtoken);
        } catch (error) {
          console.log(
            `   ⚠️  ${vaultType}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          );
          continue;
        }
      }

      const txRes = await addPaymentTokenToVault(
        provider,
        payer,
        network,
        vaultsProgram,
        vaultCommon,
        feedAddr,
        finalFee,
        finalAllowance,
        finalStable,
        finalIsFiat,
        paymentToken,
        mtoken,
      );

      results.push({ vault: vaultType, paymentToken, tx: txRes });
      console.log(`   ✅ ${vaultType}`);
    }
  }

  if (results.length > 0) {
    console.log(`\n✅ Successfully added ${results.length} payment token(s) to vault(s)!`);
  } else {
    console.log('\n⚠️  No payment tokens were added');
  }
}

const network = getNetwork();
executeNetworkScript(network, main, 'update-vault');

// # Adds all payment tokens from mTBILL config to both vaults
// yarn add:payment-token --mtoken mTBILL --network localnet

// # Adds all payment tokens to specific vault only
// yarn add:payment-token --mtoken mTBILL --network localnet --vaults minter
