import { AnchorProvider } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Keypair, PublicKey } from '@solana/web3.js';

import { executeNetworkScript } from '@/common/scriptRunner';

import { loadPaymentTokenConfig } from '../../configs/loadPaymentTokenConfig';
import { registerPaymentTokenFeed } from '../../utils/addressRegistry';
import { saveAddressesToFile } from '../../utils/addressStorage';
import { requireAcRoleGlobalAddress } from '../../utils/addressValidators';
import { getNetwork, getPaymentToken } from '../../utils/argumentParser';
import { deployFeedFromConfig } from '../../utils/feedDeployment';

async function main(provider: AnchorProvider, payer: Keypair) {
  const paymentToken = getPaymentToken();
  const network = getNetwork();

  console.log(`Deploying payment token feed for: ${paymentToken} on ${network}`);

  const config = loadPaymentTokenConfig(paymentToken);

  const mintPublicKey = new PublicKey(config.tokenAddress);
  console.log(`✓ Using token from config: ${mintPublicKey.toString()}`);

  const acRoleGlobal = requireAcRoleGlobalAddress(network);
  console.log(`Deploying data feed with mode: ${config.dataFeed.mode}...`);

  const { dataFeed, underlyingFeed } = await deployFeedFromConfig({
    provider,
    payer,
    acRole: acRoleGlobal,
    dataFeedConfig: config.dataFeed,
  });

  console.log(`✅ Data feed deployed: ${dataFeed.toString()}`);
  if (underlyingFeed) {
    console.log(`✅ Underlying feed: ${underlyingFeed.toString()}`);
  }

  const underlyingFeedPublicKey = underlyingFeed
    ? underlyingFeed instanceof PublicKey
      ? underlyingFeed
      : new PublicKey(underlyingFeed)
    : undefined;

  registerPaymentTokenFeed(network, paymentToken, {
    token: mintPublicKey,
    dataFeed: dataFeed,
    tokenProgram: TOKEN_PROGRAM_ID,
    underlyingFeed: underlyingFeedPublicKey,
  });

  await saveAddressesToFile();

  console.log(`\n✅ Payment token feed deployment completed!`);
  console.log(`   Token: ${mintPublicKey.toString()}`);
  console.log(`   Data Feed: ${dataFeed.toString()}`);
  if (underlyingFeedPublicKey) {
    console.log(`   Underlying Feed: ${underlyingFeedPublicKey.toString()}`);
  }
}

const network = getNetwork();
executeNetworkScript(network, main);
