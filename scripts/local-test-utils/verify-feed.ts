import { AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

import { addresses } from '@/common/addresses';
import { executeNetworkScript } from '@/common/scriptRunner';

import { getDataFeedProgram } from '../deploy/dataFeed';
import { getNetwork, getPaymentToken } from '../utils/argumentParser';

interface FeedState {
  acRole: PublicKey;
  underlyingFeed: PublicKey;
  mode: {
    manual?: Record<string, never>;
    switchboard?: Record<string, never>;
    pyth?: Record<string, never>;
    chainlink?: Record<string, never>;
  };
  minPrice: { toString: () => string };
  maxPrice: { toString: () => string };
  maxStaleness: number;
}

function formatMode(mode: FeedState['mode']): string {
  if (mode.manual) return 'manual';
  if (mode.switchboard) return 'switchboard';
  if (mode.pyth) return 'pyth';
  if (mode.chainlink) return 'chainlink';
  return 'unknown';
}

function formatPrice(price: { toString: () => string }): string {
  const priceBN = BigInt(price.toString());
  const priceNumber = Number(priceBN) / 1e9;
  return `${priceNumber.toFixed(9)} (raw: ${priceBN.toString()})`;
}

async function main(provider: AnchorProvider) {
  const paymentToken = getPaymentToken();
  const network = getNetwork();

  console.log(`\n🔍 Verifying feed for ${paymentToken} on ${network}\n`);

  // Get feed address from registry
  const networkAddresses = addresses[network];
  if (!networkAddresses?.feeds?.[paymentToken]) {
    throw new Error(`Feed not found for ${paymentToken} on ${network}. Please deploy it first.`);
  }

  const feedInfo = networkAddresses.feeds[paymentToken];
  const feedAddress = feedInfo.dataFeed;

  if (!feedAddress) {
    throw new Error(`Feed address not found for ${paymentToken} on ${network}`);
  }

  console.log(`📊 Feed Address: ${feedAddress.toString()}`);
  console.log(`💎 Token: ${feedInfo.token?.toString() || 'N/A'}\n`);

  // Load the data feed program
  const program = getDataFeedProgram(provider);

  // Fetch feed state
  console.log('📥 Fetching feed state from chain...');
  const feedState = (await program.account.feedState.fetch(feedAddress)) as unknown as FeedState;

  console.log('✅ Feed state fetched successfully!\n');

  // Display feed state
  console.log('📋 Feed State:');
  console.log(`   AC Role: ${feedState.acRole.toString()}`);
  console.log(`   Mode: ${formatMode(feedState.mode)}`);
  console.log(`   Underlying Feed: ${feedState.underlyingFeed.toString()}`);
  console.log(`   Min Price: ${formatPrice(feedState.minPrice)}`);
  console.log(`   Max Price: ${formatPrice(feedState.maxPrice)}`);
  console.log(`   Max Staleness: ${feedState.maxStaleness} seconds\n`);

  // Compare with stored address
  const storedUnderlyingFeed = feedInfo.underlyingFeed;
  if (storedUnderlyingFeed) {
    const matches = feedState.underlyingFeed.equals(storedUnderlyingFeed);
    console.log('🔍 Address Verification:');
    console.log(`   Stored Underlying Feed: ${storedUnderlyingFeed.toString()}`);
    console.log(`   On-chain Underlying Feed: ${feedState.underlyingFeed.toString()}`);
    console.log(`   Match: ${matches ? '✅' : '❌'}\n`);

    if (!matches) {
      console.log('⚠️  Warning: Stored address does not match on-chain address!');
      console.log('   Consider updating addresses.ts with the correct underlying feed address.\n');
    }
  } else {
    console.log('⚠️  Note: Underlying feed address not stored in addresses.ts');
    console.log(`   On-chain Underlying Feed: ${feedState.underlyingFeed.toString()}\n`);
  }

  console.log('✅ Feed verification completed!\n');
}

const network = getNetwork();
executeNetworkScript(network, main);

// yarn tsx scripts/local-test-utils/verify-feed.ts --network devnet --payment-token USDC
