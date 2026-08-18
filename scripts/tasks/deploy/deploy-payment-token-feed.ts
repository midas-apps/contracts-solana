import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

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
  let tokenProgram: PublicKey;
  if (existingAddresses?.token) {
    mintPublicKey = existingAddresses.token;
    tokenProgram = existingAddresses.tokenProgram!;
    console.log(`✓ Using existing token from addresses.ts: ${mintPublicKey.toString()}`);
  } else {
    mintPublicKey = new PublicKey(config.tokenAddress);
    tokenProgram = new PublicKey(config.tokenProgram!);
    console.log(`✓ Using token from config: ${mintPublicKey.toString()}`);
  }

  // Check if data feed already exists
  if (existingAddresses?.dataFeed && existingAddresses.underlyingFeed) {
    console.log(`✓ Data feed already exists: ${existingAddresses.dataFeed.toString()}`);
    console.log(`✓ Underlying feed: ${existingAddresses.underlyingFeed.toString()}`);
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
    existingDataFeed: existingAddresses?.dataFeed,
    isPaymentToken: true,
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
    tokenProgram: tokenProgram,
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
