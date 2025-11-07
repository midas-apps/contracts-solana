import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import { getAddress } from 'viem';

import { MProduct } from '@/common/tokenTypes';

import { TokenConfig } from '../../configs/types';
import { getTokenAcRoleAddress, getAcRoleGlobalAddress } from '../../utils/networkResolver';
import { deployChainlinkFeed } from '../contracts/feeds/chainlink';
import { deployManualFeed } from '../contracts/feeds/manual';
import { deployPythFeed } from '../contracts/feeds/pyth';
import { deploySwitchboardFeed } from '../contracts/feeds/switchboard';

/**
 * Resolves AC role for a token (token-specific or global fallback)
 */
function resolveAcRole(network: string, tokenSymbol: MProduct): PublicKey {
  const tokenAcRole = getTokenAcRoleAddress(network, tokenSymbol);
  if (tokenAcRole) return tokenAcRole;

  const globalAcRole = getAcRoleGlobalAddress(network);
  if (!globalAcRole) {
    throw new Error(`AC Role not found for token ${tokenSymbol} on ${network}`);
  }

  return globalAcRole;
}

/**
 * Converts price string to BigInt with 9 decimal precision
 */
function priceToBigInt(priceString: string): bigint {
  return BigInt(Math.floor(parseFloat(priceString) * 1e9));
}

export async function deployDataFeedFromConfig(
  provider: AnchorProvider,
  payer: Keypair,
  tokenConfig: TokenConfig,
  network: string,
  tokenSymbol: MProduct,
): Promise<PublicKey> {
  const acRole = resolveAcRole(network, tokenSymbol);
  const mode = tokenConfig.dataFeed.mode;
  const underlyingFeed = tokenConfig.dataFeed.underlyingFeed
    ? new PublicKey(tokenConfig.dataFeed.underlyingFeed)
    : undefined;

  switch (mode) {
    case 'switchboard': {
      const { env, ethRpc, ethDataFeed, feedName } = tokenConfig.dataFeed.switchboard!;

      return await deploySwitchboardFeed(
        { provider, payer },
        {
          env,
          feedName,
          ethRpc,
          ethDataFeed: getAddress(ethDataFeed),
        },
      );
    }

    case 'pyth': {
      return await deployPythFeed(
        { provider, payer },
        {
          acRole,
          underlyingFeed: underlyingFeed!,
          minPrice: priceToBigInt(tokenConfig.dataFeed.minPrice),
          maxPrice: priceToBigInt(tokenConfig.dataFeed.maxPrice),
          maxStaleness: tokenConfig.dataFeed.maxStaleness,
        },
      );
    }

    case 'chainlink': {
      return await deployChainlinkFeed(
        { provider, payer },
        {
          acRole,
          underlyingFeed: underlyingFeed!,
          minPrice: priceToBigInt(tokenConfig.dataFeed.minPrice),
          maxPrice: priceToBigInt(tokenConfig.dataFeed.maxPrice),
          maxStaleness: tokenConfig.dataFeed.maxStaleness,
        },
      );
    }

    case 'manual': {
      return await deployManualFeed(
        { provider, payer },
        {
          acRole,
          underlyingFeed,
          minPrice: priceToBigInt(tokenConfig.dataFeed.minPrice),
          maxPrice: priceToBigInt(tokenConfig.dataFeed.maxPrice),
          maxStaleness: tokenConfig.dataFeed.maxStaleness,
        },
      );
    }

    default:
      throw new Error(`Unsupported feed mode: ${mode}`);
  }
}
