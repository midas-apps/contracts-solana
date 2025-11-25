import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

import { createUserError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';

import { loadPaymentTokenConfig } from '../../configs/loadPaymentTokenConfig';
import { getFeedAddresses } from '../../utils/addressQueries';
import { registerPaymentTokenFeed } from '../../utils/addressRegistry';
import { saveAddressesToFile } from '../../utils/addressStorage';
import { requireAcRoleGlobalAddress } from '../../utils/addressValidators';
import { getNetwork, getPaymentToken } from '../../utils/argumentParser';
import { deployFeedFromConfig } from '../../utils/feedDeployment';

async function main(provider: AnchorProvider, payer: Wallet, network: string) {
  const paymentToken = getPaymentToken();

  console.log(`Deploying payment token feed for: ${paymentToken} on ${network}`);

  // Load network-specific config
  const config = loadPaymentTokenConfig(paymentToken, network);

  // Check if token already exists in addresses.ts (e.g., from mock deployment)
  const existingAddresses = getFeedAddresses(network, paymentToken);
  let mintPublicKey: PublicKey;

  if (existingAddresses?.token) {
    mintPublicKey = existingAddresses.token;
    console.log(`✓ Using existing token from addresses.ts: ${mintPublicKey.toString()}`);
  } else if (config.tokenAddress && config.tokenAddress !== 'placeholder') {
    // Fall back to config
    mintPublicKey = new PublicKey(config.tokenAddress);
    console.log(`✓ Using token from config: ${mintPublicKey.toString()}`);
  } else {
    throw createUserError(`Token address not found for ${paymentToken} on ${network}`, [
      `Deploy the mock token first: yarn deploy:mock-payment-token --network ${network} --payment-token ${paymentToken}`,
      `Or add the token address to the network config`,
    ]);
  }

  // Check if data feed already exists
  if (existingAddresses?.dataFeed) {
    console.log(`✓ Data feed already exists: ${existingAddresses.dataFeed.toString()}`);
    if (existingAddresses.underlyingFeed) {
      console.log(`✓ Underlying feed: ${existingAddresses.underlyingFeed.toString()}`);
    }
    console.log('\nℹ️  Payment token feed already deployed. Skipping...');
    return;
  }
  const acRoleGlobal = requireAcRoleGlobalAddress(network);
  console.log(`Deploying data feed with mode: ${config.dataFeed.mode}...`);

  const { dataFeed, underlyingFeed } = await deployFeedFromConfig({
    provider,
    payer,
    network,
    acRole: acRoleGlobal,
    dataFeedConfig: config.dataFeed,
  });

  console.log(`✅ Data feed deployed: ${dataFeed.toString()}`);
  if (underlyingFeed) {
    console.log(`✅ Underlying feed: ${underlyingFeed.toString()}`);
  }

  const underlyingFeedPublicKey = underlyingFeed
    ? underlyingFeed instanceof PublicKey
      ? underlyingFeed
      : new PublicKey(underlyingFeed)
    : undefined;

  registerPaymentTokenFeed(network, paymentToken, {
    token: mintPublicKey,
    dataFeed: dataFeed,
    tokenProgram: TOKEN_PROGRAM_ID,
    underlyingFeed: underlyingFeedPublicKey,
  });

  await saveAddressesToFile();

  console.log(`\n✅ Payment token feed deployment completed!`);
  console.log(`   Token: ${mintPublicKey.toString()}`);
  console.log(`   Data Feed: ${dataFeed.toString()}`);
  if (underlyingFeedPublicKey) {
    console.log(`   Underlying Feed: ${underlyingFeedPublicKey.toString()}`);
  }
}

const network = getNetwork();
executeNetworkScript(network, main, 'deployer');
