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
    createSolanaAddressBookContract: module.createSolanaAddressBookContract,
  };
}

export const createCustomSignerProvider = async (
  network: string,
  action?: string,
  mtoken?: string,
) => {
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

  return { provider, payer, customSignerModule };
};
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
    const { provider, payer } = await createCustomSignerProvider(network, action, mtoken);
    await scriptFn(provider, payer, network);
  } catch (error) {
    handleError(error);
  }
}

export const createSolanaAddressBookContract = async ({
  network,
  address,
  contractName,
  mToken,
  contractTag,
}: {
  network: string;
  address: string;
  contractName: string;
  mToken: string;
  contractTag?: string;
}) => {
  const { customSignerModule } = await createCustomSignerProvider(network, 'deployer');
  if (!customSignerModule) {
    console.log('No custom signer module available. Skipping address book registration.');
    return { sent: false };
  }

  return await customSignerModule.createSolanaAddressBookContract({
    address,
    contractName,
    mToken,
    chain: network,
    contractTag,
  });
};
