import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import { getAddress } from 'viem';

import { createUserError, isAccountNotFoundError } from '@/common/errorHandler';
import { MProduct } from '@/common/tokenTypes';

import { TokenConfig } from '../../configs/types';
import {
  getTokenAddresses,
  getTokenAcRoleAddress,
  getAcRoleGlobalAddress,
} from '../../utils/addressQueries';
import { registerAddress } from '../../utils/addressRegistry';
import { verifyNetworkInfrastructure } from '../../utils/dependencyChecker';
import { deployChainlinkFeed } from '../contracts/feeds/chainlink';
import { deployManualFeed } from '../contracts/feeds/manual';
import { deployPythFeed } from '../contracts/feeds/pyth';
import { deploySwitchboardFeed, verifySwitchboardFeed } from '../contracts/feeds/switchboard';

function resolveAcRole(network: string, tokenSymbol: MProduct): PublicKey {
  const tokenAcRole = getTokenAcRoleAddress(network, tokenSymbol);
  if (tokenAcRole) return tokenAcRole;

  const globalAcRole = getAcRoleGlobalAddress(network);
  if (!globalAcRole) {
    throw createUserError(`AC Role not found for token ${tokenSymbol} on ${network}`, [
      `Run: yarn deploy:token-core --mtoken ${tokenSymbol} --network ${network}`,
    ]);
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
        throw createUserError('Data Feed in addresses.ts does not exist on-chain', [
          'Remove the address from addresses.ts or verify the account exists',
        ]);
      }
    } catch (error) {
      if (isAccountNotFoundError(error)) {
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
          throw createUserError(
            `Switchboard feed at ${underlyingFeed.toString()} does not exist on-chain`,
            ['Verify the feed address is correct or deploy a new feed'],
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
      throw createUserError(`Unsupported feed mode: ${mode}`, [
        'Supported modes: switchboard, pyth, chainlink, manual',
      ]);
  }

  registerAddress(network, tokenSymbol, 'mTokenDataFeed', dataFeed);

  const { saveAddressesToFile } = await import('../../utils/addressStorage');
  await saveAddressesToFile();

  return dataFeed;
}
