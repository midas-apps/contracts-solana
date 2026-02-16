import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { createUserError } from '@/common/errorHandler';
import { MProduct, isMProduct, PaymentToken, isPaymentToken } from '@/common/tokenTypes';

import { getAvailableNetworks } from './getAvailableNetworks';
import { PublicKey } from '@solana/web3.js';
import { programAddresses } from '@/common/addresses';

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
  const network = (argv.network || argv.n) as string | undefined;

  if (!network) {
    throw createUserError('Network is required', [
      'Use --network or -n to specify the network',
      'Example: --network devnet or --network mainnet',
    ]);
  }

  const availableNetworks = getAvailableNetworks();
  if (availableNetworks.length > 0 && !availableNetworks.includes(network)) {
    throw createUserError(`Invalid network '${network}'`, [
      `Must be one of: ${availableNetworks.join(', ')}`,
    ]);
  }
  return network;
}

/** Get network from arguments */
export function getBufferAccount(): PublicKey {
  const argv = getParsedArgs();
  const bufferAccount = (argv.buffer || argv.ba) as string | undefined;

  if (!bufferAccount) {
    throw createUserError('Buffer account is required', [
      'Use --buffer or -b to specify the buffer account',
      'Example: --buffer 33vVYcpTkv7HyEnkFHQVY1ndUSfHNFHxyG9PBqy2MCwmc',
    ]);
  }

  try {
    return new PublicKey(bufferAccount);
  } catch {
    throw createUserError(`Invalid buffer account '${bufferAccount}'`, [
      'Must be a valid PublicKey',
    ]);
  }
}

/** Get network from arguments */
export function getProgram(): keyof (typeof programAddresses) {
  const argv = getParsedArgs();
  const program = (argv.program || argv.p) as string | undefined;

  if (!program) {
    throw createUserError('Program is required', [
      'Use --program or -p to specify the program',
      'Example: --program access_control',
    ]);
  }

  const availablePrograms = Object.keys(programAddresses);
  
  if (!availablePrograms.includes(program)) {
    throw createUserError(`Invalid program '${program}'`, [
      `Must be one of: ${availablePrograms.join(', ')}`,
    ]);
  }
  
  return program as keyof (typeof programAddresses);
}

/** Get network from arguments */
export function getMultisigTxIndex(): number {
  const argv = getParsedArgs();
  const multisigTxIndex = (argv['multisig-tx-index']) as string | undefined;

  if (!multisigTxIndex) {
    throw createUserError('Multisig tx index is required', [
      'Use --multisig-tx-index to specify the multisig tx index',
      'Example: --multisig-tx-index 1',
    ]);
  }

  const v = parseInt(multisigTxIndex);
  
  if (isNaN(v)) {
    throw createUserError(`Invalid multisig tx index '${multisigTxIndex}'`, [
      'Must be a valid number',
    ]);
  }

  return v;
}

/** Get network from arguments */
export function getAuthority<T extends boolean = true>(required?: T): T extends true ? PublicKey : PublicKey | undefined {
  required ??= true as T;
  
  const argv = getParsedArgs();
  const authority = (argv['authority']) as string | undefined;

  if (required && !authority) {
    throw createUserError('Authority is required', [
      'Use --authority to specify the authority public key',
      'Example: --authority 33vVYcpTkv7HyEnkFHQVY1ndUSfHNFHxyG9PBqy2MCwmc',
    ]);
  }

  try {
    return new PublicKey(authority);
  } catch {
    throw createUserError(`Invalid authority '${authority}'`, [
      'Must be a valid PublicKey',
    ]);
  }
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
  const amount = argv.amount || argv.a;
  if (!amount) {
    throw createUserError('Amount is required', ['Use --amount or -a to specify']);
  }
  return String(amount);
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
