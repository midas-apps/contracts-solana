import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';

import { executeNetworkScript } from '@/common/scriptRunner';

import { loadTokenConfig } from '../../configs/loadTokenConfig';
import { deployDataFeedFromConfig } from '../../deploy/orchestrators/deployDataFeed';
import { getMtoken, getNetwork } from '../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Keypair) {
  const mtoken = getMtoken();
  const network = getNetwork();

  console.log(`Deploying data feed for: ${mtoken}`);

  const config = loadTokenConfig(mtoken, network);
  const dataFeed = await deployDataFeedFromConfig(provider, payer, config, network, mtoken);

  console.log(`✅ Data feed deployed successfully`);
  console.log(`Address: ${dataFeed.toString()}`);
}

const network = getNetwork();
executeNetworkScript(network, main);
