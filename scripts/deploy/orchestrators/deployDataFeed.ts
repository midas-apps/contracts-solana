import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import { getAddress } from 'viem';

import { MProduct } from '@/common/tokenTypes';

import { TokenConfig } from '../../configs/types';
import { getTokenAddresses, registerAddress } from '../../utils/addressManager';
import { verifyNetworkInfrastructure } from '../../utils/dependencyChecker';
import { getTokenAcRoleAddress, getAcRoleGlobalAddress } from '../../utils/networkResolver';
import { deployChainlinkFeed } from '../contracts/feeds/chainlink';
import { deployManualFeed } from '../contracts/feeds/manual';
import { deployPythFeed } from '../contracts/feeds/pyth';
import { deploySwitchboardFeed, verifySwitchboardFeed } from '../contracts/feeds/switchboard';

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
  verifyNetworkInfrastructure(network);

  const existingAddresses = getTokenAddresses(network, tokenSymbol);
  if (existingAddresses?.mTokenDataFeed) {
    const { getDataFeedProgram } = await import('../contracts/dataFeed');
    const dataFeedProgram = getDataFeedProgram(provider);
    try {
      const onChainFeed = await dataFeedProgram.account.feedState.fetch(
        existingAddresses.mTokenDataFeed,
      );
      if (onChainFeed) {
        console.log(
          `    ✓ Data Feed already deployed: ${existingAddresses.mTokenDataFeed.toString()}`,
        );
        return existingAddresses.mTokenDataFeed;
      } else {
        throw new Error('Data Feed in addresses.ts does not exist on-chain');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (
        errorMessage.includes('Account does not exist') ||
        errorMessage.includes('InvalidAccountData')
      ) {
        console.warn(
          `⚠️  Data Feed in addresses.ts (${existingAddresses.mTokenDataFeed.toString()}) does not exist on-chain. Deploying new one...`,
        );
      } else {
        throw error;
      }
    }
  }

  const acRole = resolveAcRole(network, tokenSymbol);
  const mode = tokenConfig.dataFeed.mode;
  const underlyingFeed = tokenConfig.dataFeed.underlyingFeed
    ? new PublicKey(tokenConfig.dataFeed.underlyingFeed)
    : undefined;

  let dataFeed: PublicKey;
  switch (mode) {
    case 'switchboard': {
      const { env, ethRpc, ethDataFeed, feedName } = tokenConfig.dataFeed.switchboard;

      // Step 1: Check if underlyingFeed is provided, otherwise deploy a new Switchboard PullFeed
      let switchboardFeed: PublicKey;
      if (underlyingFeed) {
        // Verify the provided feed exists on-chain
        const feedExists = await verifySwitchboardFeed(provider, underlyingFeed, env);
        if (!feedExists) {
          throw new Error(
            `Switchboard feed at ${underlyingFeed.toString()} does not exist on-chain`,
          );
        }
        console.log(`    ✓ Using existing Switchboard feed: ${underlyingFeed.toString()}`);
        switchboardFeed = underlyingFeed;
      } else {
        // Deploy a new Switchboard PullFeed
        switchboardFeed = await deploySwitchboardFeed(
          { provider, payer },
          {
            env,
            feedName,
            ethRpc,
            ethDataFeed: getAddress(ethDataFeed),
          },
        );
      }

      // Step 2: Create the FeedState account that wraps the Switchboard feed
      const { deployDataFeed } = await import('../contracts/dataFeed');
      dataFeed = await deployDataFeed(
        { provider, payer },
        {
          acRole,
          mode: 'switchboard',
          underlyingFeed: switchboardFeed,
          minPrice: priceToBigInt(tokenConfig.dataFeed.minPrice),
          maxPrice: priceToBigInt(tokenConfig.dataFeed.maxPrice),
          maxStaleness: tokenConfig.dataFeed.maxStaleness,
        },
      );
      break;
    }

    case 'pyth': {
      dataFeed = await deployPythFeed(
        { provider, payer },
        {
          acRole,
          underlyingFeed: underlyingFeed,
          minPrice: priceToBigInt(tokenConfig.dataFeed.minPrice),
          maxPrice: priceToBigInt(tokenConfig.dataFeed.maxPrice),
          maxStaleness: tokenConfig.dataFeed.maxStaleness,
        },
      );
      break;
    }

    case 'chainlink': {
      dataFeed = await deployChainlinkFeed(
        { provider, payer },
        {
          acRole,
          underlyingFeed: underlyingFeed,
          minPrice: priceToBigInt(tokenConfig.dataFeed.minPrice),
          maxPrice: priceToBigInt(tokenConfig.dataFeed.maxPrice),
          maxStaleness: tokenConfig.dataFeed.maxStaleness,
        },
      );
      break;
    }

    case 'manual': {
      dataFeed = await deployManualFeed(
        { provider, payer },
        {
          acRole,
          underlyingFeed,
          minPrice: priceToBigInt(tokenConfig.dataFeed.minPrice),
          maxPrice: priceToBigInt(tokenConfig.dataFeed.maxPrice),
          maxStaleness: tokenConfig.dataFeed.maxStaleness,
        },
      );
      break;
    }

    default:
      throw new Error(`Unsupported feed mode: ${mode}`);
  }

  registerAddress(network, tokenSymbol, 'mTokenDataFeed', dataFeed);

  const { saveAddressesToFile } = await import('../../utils/addressManager');
  await saveAddressesToFile();

  return dataFeed;
}
