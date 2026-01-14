import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

import { NetworkAddresses, TokenAddresses, DataFeed } from '@/common/addresses';
import { createUserError } from '@/common/errorHandler';
import { MProduct, PaymentToken } from '@/common/tokenTypes';

import {
  getNetworkAddresses,
  getTokenAddresses,
  getFeedAddresses,
  getAcAddress,
  getAcRoleGlobalAddress,
  getTokenAcRoleAddress,
} from './addressQueries';

// Generic helper to require an address exists
function requireAddress<T>(
  getter: () => T | undefined,
  errorMessage: string,
  suggestions: string[],
): T {
  const result = getter();
  if (!result) {
    throw createUserError(errorMessage, suggestions);
  }
  return result;
}

// Network validators
export function requireNetworkAddresses(network: string): NetworkAddresses {
  return requireAddress(
    () => getNetworkAddresses(network),
    `Network addresses not found for: ${network}`,
    [`Run: yarn deploy:global-ac-role && yarn deploy:global-ac --network ${network}`],
  );
}

export function requireAcAddress(network: string): PublicKey {
  return requireAddress(() => getAcAddress(network), `AC address not found for ${network}`, [
    `Run: yarn deploy:global-ac-role && yarn deploy:global-ac --network ${network}`,
  ]);
}

export function requireAcRoleGlobalAddress(network: string): PublicKey {
  return requireAddress(
    () => getAcRoleGlobalAddress(network),
    `AC Role Global address not found for ${network}`,
    [`Run: yarn deploy:global-ac-role && yarn deploy:global-ac --network ${network}`],
  );
}

// Token validators
export function requireTokenAddresses(network: string, tokenSymbol: MProduct): TokenAddresses {
  return requireAddress(
    () => getTokenAddresses(network, tokenSymbol),
    `Token addresses not found for ${tokenSymbol} on ${network}`,
    [`Run: yarn deploy:token-core --mtoken ${tokenSymbol} --network ${network}`],
  );
}

export function requireTokenAcRoleAddress(network: string, tokenSymbol: MProduct): PublicKey {
  return requireAddress(
    () => getTokenAcRoleAddress(network, tokenSymbol),
    `Token AC Role address not found for ${tokenSymbol} on ${network}`,
    [`Run: yarn deploy:token-core --mtoken ${tokenSymbol} --network ${network}`],
  );
}

export function requireMinterVault(network: string, tokenSymbol: MProduct): PublicKey {
  return requireAddress(
    () => getTokenAddresses(network, tokenSymbol)?.minter?.commonVault,
    `Minter vault not found for ${tokenSymbol} on ${network}`,
    [`Run: yarn deploy:token-vaults --mtoken ${tokenSymbol} --network ${network}`],
  );
}

export function requireRedeemerVault(network: string, tokenSymbol: MProduct): PublicKey {
  return requireAddress(
    () => getTokenAddresses(network, tokenSymbol)?.redeemer?.commonVault,
    `Redeemer vault not found for ${tokenSymbol} on ${network}`,
    [`Run: yarn deploy:token-vaults --mtoken ${tokenSymbol} --network ${network}`],
  );
}

export function requireRedeemerVaultAccount(network: string, tokenSymbol: MProduct): PublicKey {
  return requireAddress(
    () => getTokenAddresses(network, tokenSymbol)?.redeemer?.account,
    `Redeemer vault account not found for ${tokenSymbol} on ${network}`,
    [`Run: yarn deploy:token-vaults --mtoken ${tokenSymbol} --network ${network}`],
  );
}

// Feed validators
export function requireFeedAddresses(network: string, paymentToken: PaymentToken): DataFeed {
  return requireAddress(
    () => getFeedAddresses(network, paymentToken),
    `Feed addresses not found for ${paymentToken} on ${network}`,
    [
      `Add payment token: yarn add:payment-token --payment-token ${paymentToken} --network ${network}`,
    ],
  );
}

/** Validates and returns payment token feed components */
export function requirePaymentTokenFeed(
  network: string,
  paymentToken: PaymentToken,
  tokenSymbol: MProduct,
): { token: PublicKey; dataFeed: PublicKey; tokenProgram: PublicKey } {
  const feedAddr = requireFeedAddresses(network, paymentToken);

  if (!feedAddr.token) {
    throw createUserError(`Payment token mint not found for ${paymentToken} on ${network}`, [
      `Add payment token: yarn add:payment-token --mtoken ${tokenSymbol} --payment-token ${paymentToken} --network ${network}`,
    ]);
  }
  if (!feedAddr.dataFeed) {
    throw createUserError(`Feed not found for payment token ${paymentToken} on ${network}`, [
      `Add payment token: yarn add:payment-token --mtoken ${tokenSymbol} --payment-token ${paymentToken} --network ${network}`,
    ]);
  }

  return {
    token: feedAddr.token,
    dataFeed: feedAddr.dataFeed,
    tokenProgram: feedAddr.tokenProgram || TOKEN_PROGRAM_ID,
  };
}
