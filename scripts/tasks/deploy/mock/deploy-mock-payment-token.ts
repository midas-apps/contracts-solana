import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

import { createUserError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';

import { createMockPaymentTokenMint } from '../../../deploy/mock/payment-token';
import { getFeedAddresses } from '../../../utils/addressQueries';
import { registerPaymentTokenFeed } from '../../../utils/addressRegistry';
import { saveAddressesToFile } from '../../../utils/addressStorage';
import { getNetwork, getPaymentToken } from '../../../utils/argumentParser';

const MOCK_TOKEN_CONFIG = {
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  initialSupply: '10000000',
};

async function main(provider: AnchorProvider, payer: Wallet, network: string) {
  const paymentToken = getPaymentToken();

  if (network !== 'devnet' && network !== 'localnet') {
    throw createUserError(
      `Mock payment token deployment is only available for devnet and localnet. Use deploy-payment-token-feed.ts for mainnet`,
    );
  }

  console.log(`Deploying mock payment token for: ${paymentToken} on ${network}`);

  const existingFeed = getFeedAddresses(network, paymentToken);

  if (existingFeed?.token) {
    console.log(`✓ Token already exists: ${existingFeed.token.toString()}`);
    return;
  }

  console.log('Creating mock payment token mint...');
  const mintPublicKey = await createMockPaymentTokenMint({
    provider,
    authority: payer.publicKey,
    config: MOCK_TOKEN_CONFIG,
  });
  console.log(`✅ Mock payment token mint created: ${mintPublicKey.toString()}`);

  registerPaymentTokenFeed(network, paymentToken, {
    token: mintPublicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
    dataFeed: existingFeed?.dataFeed,
    underlyingFeed: existingFeed?.underlyingFeed,
  });

  await saveAddressesToFile();

  console.log('\n✅ Mock payment token deployment completed!');
  console.log(`   Token: ${mintPublicKey.toString()}`);
}

const network = getNetwork();
executeNetworkScript(network, main);
