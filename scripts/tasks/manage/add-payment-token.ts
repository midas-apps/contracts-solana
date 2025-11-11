import { AnchorProvider } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Keypair, PublicKey, sendAndConfirmTransaction, Transaction } from '@solana/web3.js';

import { executeNetworkScript } from '@/common/scriptRunner';
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
  getPaymentToken,
  getOptionalVaults,
} from '../../utils/argumentParser';

type VaultType = 'minter' | 'redeemer';

async function addPaymentTokenToVault(
  provider: AnchorProvider,
  payer: Keypair,
  vaultsProgram: ReturnType<typeof getVaultsProgram>,
  vaultCommon: PublicKey,
  feedAddr: { token: PublicKey; dataFeed: PublicKey; tokenProgram: PublicKey } | null,
  finalFee: string,
  finalAllowance: string,
  finalStable: boolean,
  finalIsFiat: boolean,
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

  const txRes = await sendAndConfirmTransaction(provider.connection, tx, [payer], {
    commitment: 'finalized',
  });

  return txRes;
}

async function main(provider: AnchorProvider, payer: Keypair) {
  const mtoken = getMtoken();
  const network = getNetwork();
  const paymentToken = getPaymentToken();
  const cliVaults = getOptionalVaults();

  console.log(`Adding ${paymentToken} as payment token for ${mtoken}`);

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

  // Add payment token to each target vault with its specific config
  const results: { vault: VaultType; tx: string }[] = [];

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
      throw new Error(
        `Payment token ${paymentToken} not found in ${vaultType} config for ${mtoken} on ${network}. ` +
          `Please add it to the ${vaultType}.paymentTokens array in the token configuration file.`,
      );
    }

    // Get payment token config values (all come from config only)
    const finalFee = paymentTokenConfig.fee;
    const finalAllowance = paymentTokenConfig.allowance;
    const finalStable = paymentTokenConfig.stable;
    const finalIsFiat = paymentTokenConfig.isFiat ?? false;

    // Get payment token feed address from common/addresses.ts (only for non-fiat tokens)
    // Fiat tokens use FIAT_MINT (zero address) and don't have addresses in common/addresses.ts
    let feedAddr: { token: PublicKey; dataFeed: PublicKey; tokenProgram: PublicKey } | null = null;
    if (!finalIsFiat) {
      try {
        feedAddr = requirePaymentTokenFeed(network, paymentToken, mtoken);
      } catch {
        throw new Error(
          `Payment token ${paymentToken} is not fiat but addresses not found in common/addresses.ts for ${network}. ` +
            `Either add addresses to common/addresses.ts or set isFiat: true in config.`,
        );
      }
    }

    console.log(
      `Adding payment token to ${vaultType} vault (fee: ${finalFee}%, allowance: ${finalAllowance}, stable: ${finalStable}, fiat: ${finalIsFiat})...`,
    );
    const txRes = await addPaymentTokenToVault(
      provider,
      payer,
      vaultsProgram,
      vaultCommon,
      feedAddr,
      finalFee,
      finalAllowance,
      finalStable,
      finalIsFiat,
    );

    results.push({ vault: vaultType, tx: txRes });
    console.log(`✅ Payment token added to ${vaultType} vault`);
    console.log(`   Transaction: ${txRes}`);
  }

  console.log(
    `\n✅ Payment token ${paymentToken} added successfully to ${results.length} vault(s)!`,
  );
}

const network = getNetwork();
executeNetworkScript(network, main);
