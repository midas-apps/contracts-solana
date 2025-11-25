import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

import { createUserError, isAccountNotFoundError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';

import { loadTokenConfig } from '../../configs/loadTokenConfig';
import { getDataFeedProgram } from '../../deploy/dataFeed';
import { getTokenAddresses, getTokenAcRoleAddress } from '../../utils/addressQueries';
import { registerAddress } from '../../utils/addressRegistry';
import { saveAddressesToFile } from '../../utils/addressStorage';
import { getMtoken, getNetwork } from '../../utils/argumentParser';
import { deployFeedFromConfig } from '../../utils/feedDeployment';

async function main(provider: AnchorProvider, payer: Wallet, network: string) {
  const mtoken = getMtoken();

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
        `Run: yarn deploy:token-ac-role --mtoken ${mtoken} --network ${network}`,
      ]);
    }

    const feedResult = await deployFeedFromConfig({
      provider,
      payer,
      network,
      acRole,
      dataFeedConfig: config.dataFeed,
    });
    dataFeed = feedResult.dataFeed;

    // Save both the data feed and underlying feed addresses
    registerAddress(network, mtoken, 'mTokenDataFeed', dataFeed);
    if (feedResult.underlyingFeed) {
      registerAddress(network, mtoken, 'mTokenUnderlyingFeed', feedResult.underlyingFeed);
    }
  } else {
    // If data feed already exists, we should still save the underlying feed if available
    console.log(`✓ Data feed already exists: ${dataFeed.toString()}`);
  }

  await saveAddressesToFile();

  console.log('✅ Data feed deployed successfully');
  console.log(`Data Feed: ${dataFeed.toString()}`);

  // Show underlying feed if available
  const savedAddresses = getTokenAddresses(network, mtoken);
  if (savedAddresses?.mTokenUnderlyingFeed) {
    console.log(`Underlying Feed: ${savedAddresses.mTokenUnderlyingFeed.toString()}`);
  }
}

const network = getNetwork();
executeNetworkScript(network, main, 'deployer');
