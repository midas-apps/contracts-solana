import path from 'path';

import { AnchorProvider } from '@coral-xyz/anchor';
import type { Wallet } from '@coral-xyz/anchor/dist/cjs/provider';
import { config } from 'dotenv';

import { createUserError, handleError } from './errorHandler';
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
    throw createUserError('CUSTOM_SIGNER_SCRIPT_PATH environment variable is required');
  }

  const module = await import(path.resolve(customSignerScriptPath));
  return {
    signSolanaTransaction: module.signSolanaTransaction,
    getSolanaWalletAddressForAction: module.getSolanaWalletAddressForAction,
  };
}

/**
 * Run a script with the appropriate wallet:
 * - localnet: always uses WALLET_PATH keypair
 * - other networks: uses Fordefi if action provided, else WALLET_PATH
 */
export async function executeNetworkScript(
  network: string,
  scriptFn: ScriptFunction,
  action?: string,
  mtoken?: string,
): Promise<void> {
  try {
    const isLocalnet = network.toLowerCase() === 'localnet';
    const useFordefi = !isLocalnet && !!action;

    const customSignerModule = useFordefi ? await loadCustomSignerModule() : undefined;
    initCustomSigner(customSignerModule, network);

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
