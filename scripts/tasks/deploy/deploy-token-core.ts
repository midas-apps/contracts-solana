import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';

import { executeNetworkScript } from '@/common/scriptRunner';

import { loadTokenConfig } from '../../configs/loadTokenConfig';
import { deployTokenCore } from '../../deploy/orchestrators/deployTokenCore';
import { getMtoken, getNetwork } from '../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Keypair) {
  const mtoken = getMtoken();
  const network = getNetwork();

  console.log(`Deploying core token: ${mtoken}`);

  const config = loadTokenConfig(mtoken, network);
  const result = await deployTokenCore(provider, payer, config, network, mtoken);

  console.log(`✅ Core token deployment completed`);
  console.log(`AC Role: ${result.acRole.toString()}`);
  console.log(`mToken: ${result.mToken.toString()}`);
  console.log(`Token Authority: ${result.tokenAuthority.toString()}`);
}

const network = getNetwork();
executeNetworkScript(network, main);
