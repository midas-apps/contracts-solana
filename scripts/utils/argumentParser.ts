import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { createUserError } from '@/common/errorHandler';
import { MProduct, isMProduct, PaymentToken, isPaymentToken } from '@/common/tokenTypes';

import { getAvailableNetworks } from './configUtils';

/** Simple cached parser - parses all args once */
let parsedArgs: Record<string, unknown> | null = null;

function getParsedArgs(): Record<string, unknown> {
  if (!parsedArgs) {
    parsedArgs = yargs(hideBin(process.argv)).help().parseSync() as Record<string, unknown>;
  }
  return parsedArgs;
}

/** Get mtoken from arguments */
export function getMtoken(): MProduct {
  const argv = getParsedArgs();
  const mtoken = (argv.mtoken || argv.m) as string | undefined;
  if (!mtoken) {
    throw createUserError('mtoken is required', ['Use --mtoken or -m to specify the token']);
  }
  if (!isMProduct(mtoken)) {
    throw createUserError(`Invalid token '${mtoken}'`, [
      `Must be one of: ${Object.values(MProduct).join(', ')}`,
    ]);
  }
  return mtoken;
}

/** Get network from arguments */
export function getNetwork(): string {
  const argv = getParsedArgs();
  const network = (argv.network || argv.n || 'devnet') as string;
  const availableNetworks = getAvailableNetworks();
  if (availableNetworks.length > 0 && !availableNetworks.includes(network)) {
    throw createUserError(`Invalid network '${network}'`, [
      `Must be one of: ${availableNetworks.join(', ')}`,
    ]);
  }
  return network;
}

/** Get payment token from arguments (optional) */
export function getPaymentToken(): PaymentToken {
  const argv = getParsedArgs();
  const paymentToken = (argv['payment-token'] || argv.p) as string | undefined;
  if (!paymentToken) {
    throw createUserError('Payment token is required', ['Use --payment-token or -p to specify']);
  }
  if (!isPaymentToken(paymentToken)) {
    throw createUserError(`Invalid payment token '${paymentToken}'`, [
      `Must be one of: ${Object.values(PaymentToken).join(', ')}`,
    ]);
  }
  return paymentToken;
}

/** Get amount from arguments (optional) */
export function getAmount(): string {
  const argv = getParsedArgs();
  const amount = (argv.amount || argv.a) as string | undefined;
  if (!amount) {
    throw createUserError('Amount is required', ['Use --amount or -a to specify']);
  }
  return amount;
}

/** Get role from arguments (optional) */
export function getRole(): string {
  const argv = getParsedArgs();
  const role = (argv.role || argv.r) as string | undefined;
  if (!role) {
    throw createUserError('Role is required', ['Use --role or -r to specify']);
  }
  return role;
}

/** Get authority type from arguments (optional) */
export function getAuthorityType():
  | 'MintTokens'
  | 'FreezeAccount'
  | 'AccountOwner'
  | 'CloseAccount' {
  const argv = getParsedArgs();
  const authorityType = argv['authority-type'] as string | undefined;
  if (!authorityType) {
    throw createUserError('Authority type is required', ['Use --authority-type to specify']);
  }
  if (!['MintTokens', 'FreezeAccount', 'AccountOwner', 'CloseAccount'].includes(authorityType)) {
    throw createUserError(`Invalid authority type '${authorityType}'`, [
      'Must be one of: MintTokens, FreezeAccount, AccountOwner, CloseAccount',
    ]);
  }
  return authorityType as 'MintTokens' | 'FreezeAccount' | 'AccountOwner' | 'CloseAccount';
}

/** Get optional string argument */
export function getOptionalArg(key: string): string | undefined {
  const argv = getParsedArgs();
  return argv[key] as string | undefined;
}

/** Get optional vaults array from arguments */
export function getOptionalVaults(): ('minter' | 'redeemer')[] | undefined {
  const argv = getParsedArgs();
  const vaults = argv.vaults as string | string[] | undefined;
  if (!vaults) return undefined;

  const vaultArray = Array.isArray(vaults) ? vaults : vaults.split(',').map((v) => v.trim());
  const validVaults: ('minter' | 'redeemer')[] = [];

  for (const vault of vaultArray) {
    if (vault === 'minter' || vault === 'redeemer') {
      validVaults.push(vault);
    } else {
      throw createUserError(`Invalid vault '${vault}'`, [
        "Must be one of: 'minter', 'redeemer'",
        'Example: --vaults minter,redeemer or --vaults minter',
      ]);
    }
  }

  if (validVaults.length === 0) {
    throw createUserError('No valid vaults specified', [
      "Must include at least one of: 'minter', 'redeemer'",
    ]);
  }

  return validVaults;
}
