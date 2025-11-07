import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';

import { executeNetworkScript } from '@/common/utils';

import { loadTokenConfig, convertPublicKeysInConfig } from '../../configs/loadTokenConfig';
import { deployDataFeedFromConfig } from '../../deploy/orchestrators/deployDataFeed';
import { registerAddress } from '../../utils/addressManager';
import { getMtoken, getNetwork } from '../../utils/argumentParser';
import { verifyNetworkInfrastructure } from '../../utils/dependencyChecker';

async function main(provider: AnchorProvider, payer: Keypair) {
  const mtoken = getMtoken();
  const network = getNetwork();

  console.log(`╔══════════════════════════════════════════════╗`);
  console.log(`║          Data Feed Deployment Script         ║`);
  console.log(`╚══════════════════════════════════════════════╝`);
  console.log(`Token: ${mtoken}`);
  console.log(`Network: ${network}`);
  console.log(`RPC URL: ${provider.connection.rpcEndpoint}`);
  console.log(`Deployer: ${payer.publicKey.toString()}`);
  console.log('');

  // Verify network infrastructure exists
  verifyNetworkInfrastructure(network);

  // Load configuration
  console.log('Loading configuration...');
  const config = loadTokenConfig(mtoken, network);
  console.log('✓ Configuration loaded and validated');

  // Convert string PublicKeys to PublicKey objects
  const finalConfig = convertPublicKeysInConfig(config);

  // Deploy data feed
  console.log('Deploying Data Feed...');
  const dataFeed = await deployDataFeedFromConfig(provider, payer, finalConfig, network, mtoken);
  registerAddress(network, mtoken, 'mTokenDataFeed', dataFeed);

  console.log('\n' + '='.repeat(50));
  console.log('✅ Data feed deployed successfully!');
  console.log(`Data Feed: ${dataFeed.toString()}`);
  console.log('='.repeat(50));
}

const network = getNetwork();
executeNetworkScript(network, main);
