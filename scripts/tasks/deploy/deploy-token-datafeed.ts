import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';

import { executeNetworkScript } from '@/common/scriptRunner';

import { loadTokenConfig } from '../../configs/loadTokenConfig';
import { deployDataFeedFromConfig } from '../../deploy/orchestrators/deployDataFeed';
import { getMtoken, getNetwork } from '../../utils/argumentParser';
import { verifyDependencies, verifyDataFeedOnChain } from '../../utils/dependencyChecker';

async function main(provider: AnchorProvider, payer: Keypair) {
  const mtoken = getMtoken();
  const network = getNetwork();

  console.log('=== Data Feed Deployment Script ===');
  console.log(`Token: ${mtoken}`);
  console.log(`Network: ${network}`);
  console.log(`RPC URL: ${provider.connection.rpcEndpoint}`);
  console.log(`Deployer: ${payer.publicKey.toString()}`);
  console.log('');

  verifyDependencies(network, mtoken, ['acRole', 'mToken', 'tokenAuthority']);

  const verification = await verifyDataFeedOnChain(provider, network, mtoken);
  if (verification.exists && verification.address) {
    console.log('\n' + '='.repeat(50));
    console.log('ℹ️  Data feed already exists on-chain');
    console.log(`Data Feed: ${verification.address.toString()}`);
    console.log('='.repeat(50));
    return;
  }

  console.log('Loading configuration...');
  const config = loadTokenConfig(mtoken, network);
  console.log('✓ Configuration loaded and validated');

  console.log('Deploying Data Feed...');
  const dataFeed = await deployDataFeedFromConfig(provider, payer, config, network, mtoken);

  console.log('\n' + '='.repeat(50));
  console.log('✅ Data feed deployed successfully!');
  console.log(`Data Feed: ${dataFeed.toString()}`);
  console.log('='.repeat(50));
}

const network = getNetwork();
executeNetworkScript(network, main);
