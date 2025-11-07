import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';

import { executeNetworkScript } from '@/common/utils';

import { loadTokenConfig } from '../../configs/loadTokenConfig';
import { deployNetworkInfrastructure } from '../../deploy/orchestrators/deployNetworkInfrastructure';
import { deployTokenFull } from '../../deploy/orchestrators/deployToken';
import { getMtoken, getNetwork } from '../../utils/argumentParser';
import { verifyNoTokenComponentsDeployed } from '../../utils/dependencyChecker';

async function main(provider: AnchorProvider, payer: Keypair) {
  const mtoken = getMtoken();
  const network = getNetwork();

  console.log(`Deploying ${mtoken} on ${network}`);
  console.log(`RPC: ${provider.connection.rpcEndpoint}`);
  console.log(`Deployer: ${payer.publicKey.toString()}\n`);

  verifyNoTokenComponentsDeployed(network, mtoken);

  console.log('Step 1/2: Network Infrastructure');
  await deployNetworkInfrastructure(provider, payer, network);

  console.log('\nStep 2/2: Token Deployment');
  const config = loadTokenConfig(mtoken, network);

  await deployTokenFull(provider, payer, config, network, mtoken);

  console.log('\n✅ Deployment completed successfully!');
}

const network = getNetwork();
executeNetworkScript(network, main);
