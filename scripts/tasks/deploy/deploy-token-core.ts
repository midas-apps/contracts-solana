import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';

import { executeNetworkScript } from '@/common/utils';

import { loadTokenConfig, convertPublicKeysInConfig } from '../../configs/loadTokenConfig';
import { deployTokenCore } from '../../deploy/orchestrators/deployTokenCore';
import { parseTokenDeploymentArgs } from '../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Keypair) {
  const args = parseTokenDeploymentArgs();

  console.log(`╔══════════════════════════════════════════════╗`);
  console.log(`║       Core Token Deployment Script            ║`);
  console.log(`╚══════════════════════════════════════════════╝`);
  console.log(`Token: ${args.mtoken}`);
  console.log(`Network: ${args.network}`);
  console.log(`RPC URL: ${provider.connection.rpcEndpoint}`);
  console.log(`Deployer: ${payer.publicKey.toString()}`);
  console.log('');

  // Load and validate configuration
  console.log('Loading configuration...');
  const config = loadTokenConfig(args.mtoken, args.network);
  console.log('✓ Configuration loaded and validated');

  // Convert string PublicKeys to PublicKey objects
  const finalConfig = convertPublicKeysInConfig(config);

  // Deploy core token components (AC Role, mToken, Token Authority)
  await deployTokenCore(provider, payer, finalConfig, args.network, args.mtoken);

  console.log('\n' + '='.repeat(50));
  console.log('✅ Core token deployment completed!');
  console.log('='.repeat(50));
  console.log('\nNext steps:');
  console.log(
    `1. Deploy data feed: yarn deploy:token-datafeed --mtoken ${args.mtoken} --network ${args.network}`,
  );
  console.log(
    `2. Deploy vaults: yarn deploy:token-vaults --mtoken ${args.mtoken} --network ${args.network}`,
  );
  console.log(
    `   OR deploy everything: yarn deploy:all --mtoken ${args.mtoken} --network ${args.network}`,
  );
  console.log('='.repeat(50));
}

// Parse args first to get network, then create provider for that network
const args = parseTokenDeploymentArgs();
executeNetworkScript(args.network, main);
