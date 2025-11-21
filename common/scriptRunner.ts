import path from 'path';

import { AnchorProvider } from '@coral-xyz/anchor';
import type { Wallet } from '@coral-xyz/anchor/dist/cjs/provider';
import { config } from 'dotenv';

import { createUserError, handleError } from './errorHandler';
import { isFordefiSupportedNetwork } from './fordefiNetworkMapper';
import { createNetworkProvider, CustomSignerModule } from './provider';
import { initCustomSigner } from './solanaTxHelper';

config();

type ScriptFunction = (
  provider: AnchorProvider,
  wallet: Wallet,
  network: string,
) => Promise<unknown>;

async function loadCustomSignerModule(): Promise<CustomSignerModule> {
  const customSignerScriptPath = process.env.CUSTOM_SIGNER_SCRIPT_PATH;
  if (!customSignerScriptPath) {
    throw new Error(
      'CUSTOM_SIGNER_SCRIPT_PATH environment variable is required. Please set it to the path of your custom signer module.',
    );
  }

  const scriptPathResolved = path.resolve(customSignerScriptPath);
  const importedModule = await import(scriptPathResolved);

  return {
    signSolanaTransaction: importedModule.signSolanaTransaction,
    getSolanaWalletAddressForAction: importedModule.getSolanaWalletAddressForAction,
  };
}

/**
 * Executes a network script using a specified signing wallet.
 *
 * @param network - Solana cluster (e.g. 'devnet', 'mainnet')
 * @param scriptFn - The main script function to run, takes (provider, wallet)
 * @param action - Determines which wallet to use: pass 'local-wallet' to use the local keypair from WALLET_PATH,
 *                 or any other value (e.g., 'deployer', 'update-ac', 'update-feed-mtoken', etc.) to use a Fordefi custom signer (requires CUSTOM_SIGNER_SCRIPT_PATH).
 * @param mtoken - Optional mToken identifier (e.g., 'mTBILL') required for mToken-specific actions like 'update-feed-mtoken'
 *
 * Example:
 *   executeNetworkScript('devnet', main, 'local-wallet');
 *   executeNetworkScript('mainnet', main, 'deployer');
 *   executeNetworkScript('mainnet', main, 'update-feed-mtoken', 'mTBILL');
 */
export async function executeNetworkScript(
  network: string,
  scriptFn: ScriptFunction,
  action: 'local-wallet' | 'deployer' | string,
  mtoken?: string,
): Promise<void> {
  try {
    const useLocalWallet = action === 'local-wallet' || !isFordefiSupportedNetwork(network);

    if (useLocalWallet && action !== 'local-wallet') {
      throw createUserError(
        `Network '${network}' is not supported by Fordefi. Use local wallet instead.`,
      );
    }

    const customSignerModule = useLocalWallet ? undefined : await loadCustomSignerModule();

    initCustomSigner(customSignerModule);

    const { provider, payer } = await createNetworkProvider(
      network,
      customSignerModule,
      action,
      mtoken,
    );

    await scriptFn(provider, payer, network);
  } catch (error) {
    handleError(error);
  }
}
