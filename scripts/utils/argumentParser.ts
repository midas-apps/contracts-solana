import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { MProduct, isMProduct, PaymentToken, isPaymentToken } from '@/common/tokenTypes';
import { tokenConfigs } from '@/scripts/configs/tokens';

import { tokenConfigWithNetworksSchema } from '../configs/types';

/**
 * Get available token symbols from config files
 */
export function getAvailableTokens(): MProduct[] {
  return Object.keys(tokenConfigs).filter((key): key is MProduct => isMProduct(key));
}

/**
 * Get available networks from token configs
 * Derives networks from the first token config
 */
export function getAvailableNetworks(): string[] {
  for (const config of Object.values(tokenConfigs)) {
    const parseResult = tokenConfigWithNetworksSchema.safeParse(config);
    if (parseResult.success) {
      return Object.keys(parseResult.data.networks);
    }
  }
  return [];
}

/**
 * Create base yargs instance with common options
 */
function createBaseYargs() {
  const availableTokens = getAvailableTokens();
  const availableNetworks = getAvailableNetworks();

  return yargs(hideBin(process.argv))
    .option('mtoken', {
      alias: 'm',
      type: 'string',
      demandOption: true,
      describe: 'Token symbol to deploy (e.g., mTBILL)',
      choices: availableTokens.length > 0 ? availableTokens.map((t) => t.toString()) : undefined,
    })
    .option('network', {
      alias: 'n',
      type: 'string',
      default: 'devnet',
      describe: 'Network to deploy to',
      choices: availableNetworks,
    });
}

export interface TokenDeploymentArgs {
  mtoken: MProduct;
  network: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export function parseTokenDeploymentArgs(): TokenDeploymentArgs {
  const argv = createBaseYargs().help().parseSync();

  const mtoken = argv.mtoken as string;
  if (!isMProduct(mtoken)) {
    throw new Error(
      `Invalid token '${mtoken}'. Must be one of: ${Object.values(MProduct).join(', ')}`,
    );
  }

  return {
    ...argv,
    mtoken,
  } as TokenDeploymentArgs;
}

export interface PaymentTokenArgs extends TokenDeploymentArgs {
  paymentToken: PaymentToken;
  fee?: string;
  allowance?: string;
  stable?: boolean;
  isFiat?: boolean;
}

export function parsePaymentTokenArgs(): PaymentTokenArgs {
  const argv = createBaseYargs()
    .option('payment-token', {
      alias: 'p',
      type: 'string',
      demandOption: true,
      describe: 'Payment token symbol (e.g., USDC)',
    })
    .option('fee', {
      type: 'string',
      describe: "Fee percentage (e.g., '0.1' for 0.1%)",
    })
    .option('allowance', {
      type: 'string',
      describe: 'Allowance amount',
    })
    .option('stable', {
      type: 'boolean',
      describe: 'Whether this is a stablecoin (uses 1:1 rate)',
    })
    .option('is-fiat', {
      type: 'boolean',
      describe: 'Whether this is a fiat payment token',
    })
    .help()
    .parseSync();

  const mtoken = argv.mtoken as string;
  if (!isMProduct(mtoken)) {
    throw new Error(
      `Invalid token '${mtoken}'. Must be one of: ${Object.values(MProduct).join(', ')}`,
    );
  }

  const paymentToken = argv['payment-token'] as string;
  if (!isPaymentToken(paymentToken)) {
    throw new Error(
      `Invalid payment token '${paymentToken}'. Must be one of: ${Object.values(PaymentToken).join(
        ', ',
      )}`,
    );
  }

  return {
    mtoken,
    network: argv.network as string,
    paymentToken,
    fee: argv.fee as string | undefined,
    allowance: argv.allowance as string | undefined,
    stable: argv.stable as boolean | undefined,
    isFiat: argv['is-fiat'] as boolean | undefined,
  };
}

export interface NetworkArgs {
  network: string;
}

export function parseNetworkArgs(): NetworkArgs {
  const availableNetworks = getAvailableNetworks();

  const argv = yargs(hideBin(process.argv))
    .option('network', {
      alias: 'n',
      type: 'string',
      default: 'devnet',
      describe: 'Network to deploy to',
      choices: availableNetworks,
    })
    .help()
    .parseSync();

  return {
    network: argv.network as string,
  };
}

export function validateTokenExists(tokenSymbol: MProduct): void {
  const availableTokens = getAvailableTokens();
  if (!availableTokens.includes(tokenSymbol)) {
    throw new Error(
      `Token '${tokenSymbol}' not found. Available tokens: ${availableTokens.join(', ')}`,
    );
  }
}

export function validateNetworkExists(network: string): void {
  const availableNetworks = getAvailableNetworks();
  if (!availableNetworks.includes(network)) {
    throw new Error(
      `Network '${network}' not found. Available networks: ${availableNetworks.join(', ')}`,
    );
  }
}
