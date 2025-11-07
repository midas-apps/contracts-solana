import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';

import { executeNetworkScript } from '@/common/utils';

import { loadTokenConfig, convertPublicKeysInConfig } from '../../configs/loadTokenConfig';
import { deployDataFeedFromConfig } from '../../deploy/orchestrators/deployDataFeed';
import { registerAddress } from '../../utils/addressManager';
import { parseTokenDeploymentArgs } from '../../utils/argumentParser';
import { verifyNetworkInfrastructure } from '../../utils/dependencyChecker';

async function main(provider: AnchorProvider, payer: Keypair) {
  const args = parseTokenDeploymentArgs();

  console.log(`╔══════════════════════════════════════════════╗`);
  console.log(`║          Data Feed Deployment Script         ║`);
  console.log(`╚══════════════════════════════════════════════╝`);
  console.log(`Token: ${args.mtoken}`);
  console.log(`Network: ${args.network}`);
  console.log(`RPC URL: ${provider.connection.rpcEndpoint}`);
  console.log(`Deployer: ${payer.publicKey.toString()}`);
  console.log('');

  // Verify network infrastructure exists
  verifyNetworkInfrastructure(args.network);

  // Load configuration
  console.log('Loading configuration...');
  const config = loadTokenConfig(args.mtoken, args.network);
  console.log('✓ Configuration loaded and validated');

  // Convert string PublicKeys to PublicKey objects
  const finalConfig = convertPublicKeysInConfig(config);

  // Deploy data feed
  console.log('Deploying Data Feed...');
  const dataFeed = await deployDataFeedFromConfig(
    provider,
    payer,
    finalConfig,
    args.network,
    args.mtoken,
  );
  registerAddress(args.network, args.mtoken, 'mTokenDataFeed', dataFeed);

  console.log('\n' + '='.repeat(50));
  console.log('✅ Data feed deployed successfully!');
  console.log(`Data Feed: ${dataFeed.toString()}`);
  console.log('='.repeat(50));
}

const args = parseTokenDeploymentArgs();
executeNetworkScript(args.network, main);
