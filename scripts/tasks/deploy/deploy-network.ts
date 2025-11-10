import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';

import { executeNetworkScript } from '@/common/scriptRunner';

import { deployNetworkInfrastructure } from '../../deploy/orchestrators/deployNetworkInfrastructure';
import { getNetwork } from '../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Keypair) {
  const network = getNetwork();

  console.log(`╔══════════════════════════════════════════════╗`);
  console.log(`║    Network Infrastructure Deployment         ║`);
  console.log(`╚══════════════════════════════════════════════╝`);
  console.log(`Network: ${network}`);
  console.log(`RPC URL: ${provider.connection.rpcEndpoint}`);
  console.log(`Deployer: ${payer.publicKey.toString()}`);
  console.log('');
  console.log('This will deploy AC and AC Role Global for the network.');
  console.log('These are shared across all tokens on this network.');
  console.log('');

  const result = await deployNetworkInfrastructure(provider, payer, network);

  console.log('\n' + '='.repeat(50));
  if (result.alreadyDeployed) {
    console.log('ℹ️  Network infrastructure already deployed');
    console.log('   No deployment was needed.');
  } else {
    console.log('✅ Network infrastructure deployed successfully!');
  }
  console.log('='.repeat(50));
  console.log('\nNext steps:');
  console.log('You can now deploy tokens using either:');
  console.log(`  1. Full deployment: yarn deploy:all --mtoken <token> --network ${network}`);
  console.log(`  2. Step-by-step: yarn deploy:token-core --mtoken <token> --network ${network}`);
}

const network = getNetwork();
executeNetworkScript(network, main);
