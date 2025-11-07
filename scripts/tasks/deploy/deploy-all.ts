import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';

import { executeNetworkScript } from '@/common/utils';

import { loadTokenConfig, convertPublicKeysInConfig } from '../../configs/loadTokenConfig';
import { deployNetworkInfrastructure } from '../../deploy/orchestrators/deployNetworkInfrastructure';
import { deployTokenFull } from '../../deploy/orchestrators/deployToken';
import { getMtoken, getNetwork } from '../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Keypair) {
  const mtoken = getMtoken();
  const network = getNetwork();

  console.log(`Deploying ${mtoken} on ${network}`);
  console.log(`RPC: ${provider.connection.rpcEndpoint}`);
  console.log(`Deployer: ${payer.publicKey.toString()}\n`);

  // Step 1: Deploy network infrastructure (idempotent - checks if already deployed)
  console.log('Step 1/2: Network Infrastructure');
  await deployNetworkInfrastructure(provider, payer, network);

  // Step 2: Deploy full token
  console.log('\nStep 2/2: Token Deployment');
  const config = loadTokenConfig(mtoken, network);
  const finalConfig = convertPublicKeysInConfig(config);

  await deployTokenFull(provider, payer, finalConfig, network, mtoken);

  console.log('\n✅ Deployment completed successfully!');
}

// Parse args first to get network, then create provider for that network
const network = getNetwork();
executeNetworkScript(network, main);
