import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import { getAddress } from 'viem';

import { createUserError, isAccountNotFoundError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';

import { loadTokenConfig } from '../../configs/loadTokenConfig';
import {
  deployDataFeed as deployDataFeedContract,
  getDataFeedProgram,
} from '../../deploy/dataFeed';
import { deployChainlinkFeed } from '../../deploy/feeds/chainlink';
import { deployManualFeed } from '../../deploy/feeds/manual';
import { deployPythFeed } from '../../deploy/feeds/pyth';
import { deploySwitchboardFeed, verifySwitchboardFeed } from '../../deploy/feeds/switchboard';
import { getTokenAddresses, getTokenAcRoleAddress } from '../../utils/addressQueries';
import { registerAddress } from '../../utils/addressRegistry';
import { saveAddressesToFile } from '../../utils/addressStorage';
import { getMtoken, getNetwork } from '../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Keypair) {
  const mtoken = getMtoken();
  const network = getNetwork();

  console.log(`Deploying data feed for: ${mtoken}`);

  const config = loadTokenConfig(mtoken, network);
  const existingAddresses = getTokenAddresses(network, mtoken);
  const dataFeedProgram = getDataFeedProgram(provider);

  let dataFeed: PublicKey;
  if (existingAddresses?.mTokenDataFeed) {
    try {
      await dataFeedProgram.account.feedState.fetch(existingAddresses.mTokenDataFeed);
      dataFeed = existingAddresses.mTokenDataFeed;
    } catch (error) {
      if (isAccountNotFoundError(error)) {
        // Deploy new feed - fall through to deployment logic
      } else {
        throw createUserError('Data Feed in addresses.ts does not exist on-chain', [
          'Remove the address from addresses.ts or verify the account exists',
        ]);
      }
    }
  }

  if (!dataFeed) {
    const acRole = getTokenAcRoleAddress(network, mtoken);
    if (!acRole) {
      throw createUserError(`Token AC Role not found for ${mtoken} on ${network}`, [
        `Run: yarn deploy:token-core --mtoken ${mtoken} --network ${network}`,
      ]);
    }

    const mode = config.dataFeed.mode;
    const underlyingFeed = config.dataFeed.underlyingFeed
      ? new PublicKey(config.dataFeed.underlyingFeed)
      : undefined;

    const feedConfig = {
      acRole,
      underlyingFeed,
      minPrice: BigInt(Math.floor(parseFloat(config.dataFeed.minPrice) * 1e9)),
      maxPrice: BigInt(Math.floor(parseFloat(config.dataFeed.maxPrice) * 1e9)),
      maxStaleness: config.dataFeed.maxStaleness,
    };

    switch (mode) {
      case 'switchboard': {
        const { env, ethRpc, ethDataFeed, feedName } = config.dataFeed.switchboard;

        let switchboardFeed: PublicKey;
        if (underlyingFeed) {
          const feedExists = await verifySwitchboardFeed(provider, underlyingFeed, env);
          if (!feedExists) {
            throw createUserError(
              `Switchboard feed at ${underlyingFeed.toString()} does not exist on-chain`,
              ['Verify the feed address is correct or deploy a new feed'],
            );
          }
          switchboardFeed = underlyingFeed;
        } else {
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

        dataFeed = await deployDataFeedContract(
          { provider, payer },
          {
            ...feedConfig,
            underlyingFeed: switchboardFeed,
            mode: 'switchboard',
          },
        );
        break;
      }

      case 'pyth': {
        dataFeed = await deployPythFeed({ provider, payer }, feedConfig);
        break;
      }

      case 'chainlink': {
        dataFeed = await deployChainlinkFeed({ provider, payer }, feedConfig);
        break;
      }

      case 'manual': {
        dataFeed = await deployManualFeed({ provider, payer }, feedConfig);
        break;
      }

      default:
        throw createUserError(`Unsupported feed mode: ${mode}`, [
          'Supported modes: switchboard, pyth, chainlink, manual',
        ]);
    }
  }

  registerAddress(network, mtoken, 'mTokenDataFeed', dataFeed);
  await saveAddressesToFile();

  console.log('✅ Data feed deployed successfully');
  console.log(`Address: ${dataFeed.toString()}`);
}

const network = getNetwork();
executeNetworkScript(network, main);
