import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';

import { executeNetworkScript } from '@/common/utils';

import { loadTokenConfig } from '../../configs/loadTokenConfig';
import { deployTokenCore } from '../../deploy/orchestrators/deployTokenCore';
import { getMtoken, getNetwork } from '../../utils/argumentParser';
import { verifyNetworkInfrastructure } from '../../utils/dependencyChecker';

async function main(provider: AnchorProvider, payer: Keypair) {
  const mtoken = getMtoken();
  const network = getNetwork();

  console.log(`╔══════════════════════════════════════════════╗`);
  console.log(`║       Core Token Deployment Script            ║`);
  console.log(`╚══════════════════════════════════════════════╝`);
  console.log(`Token: ${mtoken}`);
  console.log(`Network: ${network}`);
  console.log(`RPC URL: ${provider.connection.rpcEndpoint}`);
  console.log(`Deployer: ${payer.publicKey.toString()}`);
  console.log('');

  verifyNetworkInfrastructure(network);

  console.log('Loading configuration...');
  const config = loadTokenConfig(mtoken, network);
  console.log('✓ Configuration loaded and validated');

  await deployTokenCore(provider, payer, config, network, mtoken);

  console.log('\n' + '='.repeat(50));
  console.log('✅ Core token deployment completed!');
  console.log('='.repeat(50));
  console.log('\nNext steps:');
  console.log(
    `1. Deploy data feed: yarn deploy:token-datafeed --mtoken ${mtoken} --network ${network}`,
  );
  console.log(`2. Deploy vaults: yarn deploy:token-vaults --mtoken ${mtoken} --network ${network}`);
  console.log('='.repeat(50));
}

const network = getNetwork();
executeNetworkScript(network, main);
