import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import * as sb from '@switchboard-xyz/on-demand';

import { addresses } from '@/common/addresses';
import { executeNetworkScript } from '@/common/scriptRunner';
import { MProduct, PaymentToken } from '@/common/tokenTypes';

import { getDataFeedProgram } from '../deploy/dataFeed';
import { getNetwork, getOptionalArg } from '../utils/argumentParser';

// Switchboard program IDs from official documentation
// https://docs.switchboard.xyz/tooling-and-resources/technical-resources-and-documentation/solana-accounts
const SWITCHBOARD_PROGRAM_IDS = {
  devnet: 'Aio4gaXjXzJNVLtzwtNVmSqGKpANtXhybbkhtAC94ji2',
  mainnet: 'SBondMDrcV3K4kxZR1HNVT7osZxAHVHgYXL5Ze1oMUv',
} as const;

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

function convertToBase9(value: bigint, decimals: number): bigint {
  if (decimals === 9) return value;
  if (decimals > 9) return value / BigInt(10 ** (decimals - 9));
  return value * BigInt(10 ** (9 - decimals));
}

async function fetchUnderlyingPrice(
  provider: AnchorProvider,
  feedState: FeedState,
  network: string,
): Promise<{ price: bigint; decimals: number; timestamp?: number } | null> {
  const mode = formatMode(feedState.mode);

  try {
    if (mode === 'switchboard') {
      const env = network === 'mainnet' ? 'mainnet' : 'devnet';
      const programId = new PublicKey(SWITCHBOARD_PROGRAM_IDS[env]);
      const idl = await Program.fetchIdl(programId, provider);
      if (!idl) return null;

      const program = new Program(idl, provider);
      const feedAccount = new sb.PullFeed(program, feedState.underlyingFeed);
      const data = await feedAccount.loadData();

      return {
        price: convertToBase9(BigInt(data.result.value.toString()), 18),
        decimals: 18,
      };
    }

    // For other modes, we'd need their specific implementations
    // Manual feeds would require fetching ManualFeedState
    // Pyth would need pyth SDK
    // Chainlink would need chainlink SDK
    return null;
  } catch (error) {
    console.log(
      `   ⚠️  Could not fetch price: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    return null;
  }
}

async function main(provider: AnchorProvider) {
  const network = getNetwork();
  const paymentToken = getOptionalArg('payment-token') || getOptionalArg('p');
  const mtoken = getOptionalArg('mtoken') || getOptionalArg('m');

  if (!paymentToken && !mtoken) {
    throw new Error('Either --payment-token or --mtoken is required');
  }

  if (paymentToken && mtoken) {
    throw new Error('Cannot specify both --payment-token and --mtoken');
  }

  const networkAddresses = addresses[network];
  let feedAddress: PublicKey | undefined;
  let tokenAddress: PublicKey | undefined;
  let feedName: string;
  let storedUnderlyingFeed: PublicKey | undefined;

  if (paymentToken) {
    feedName = `${paymentToken} payment token`;
    const feedInfo = networkAddresses?.feeds?.[paymentToken as PaymentToken];
    if (!feedInfo) {
      throw new Error(`Feed not found for ${paymentToken} on ${network}. Please deploy it first.`);
    }
    feedAddress = feedInfo.dataFeed;
    tokenAddress = feedInfo.token;
    storedUnderlyingFeed = feedInfo.underlyingFeed;
  } else if (mtoken) {
    feedName = `${mtoken} mToken`;
    const tokenInfo = networkAddresses?.tokens?.[mtoken as MProduct];
    if (!tokenInfo) {
      throw new Error(`Token info not found for ${mtoken} on ${network}. Please deploy it first.`);
    }
    feedAddress = tokenInfo.mTokenDataFeed;
    tokenAddress = tokenInfo.mToken;
  }

  if (!feedAddress) {
    throw new Error(`Feed address not found for ${feedName} on ${network}`);
  }

  console.log(`\n🔍 Verifying feed for ${feedName} on ${network}\n`);
  console.log(`📊 Feed Address: ${feedAddress.toString()}`);
  console.log(`💎 Token: ${tokenAddress?.toString() || 'N/A'}\n`);

  // Load the data feed program
  const program = getDataFeedProgram(provider);

  // Fetch feed state
  console.log('📥 Fetching feed state from chain...');
  const feedState = (await program.account.feedState.fetch(feedAddress)) as unknown as FeedState;
  const mode = formatMode(feedState.mode);

  console.log('✅ Feed state fetched successfully!\n');

  // Display feed configuration
  console.log('📋 Feed Configuration:');
  console.log(`   AC Role: ${feedState.acRole.toString()}`);
  console.log(`   Mode: ${mode}`);
  console.log(`   Underlying Feed: ${feedState.underlyingFeed.toString()}`);
  console.log(`   Min Price: ${formatPrice(feedState.minPrice)}`);
  console.log(`   Max Price: ${formatPrice(feedState.maxPrice)}`);
  console.log(`   Max Staleness: ${feedState.maxStaleness}s\n`);

  // Verify stored address matches on-chain (only for payment tokens)
  if (storedUnderlyingFeed) {
    const matches = feedState.underlyingFeed.equals(storedUnderlyingFeed);
    console.log('🔍 Address Verification:');
    console.log(`   Stored:   ${storedUnderlyingFeed.toString()}`);
    console.log(`   On-chain: ${feedState.underlyingFeed.toString()}`);
    console.log(`   Status:   ${matches ? '✅ Match' : '❌ Mismatch'}\n`);

    if (!matches) {
      console.log('⚠️  Warning: Update addresses.ts with the correct underlying feed address\n');
    }
  } else {
    console.log('ℹ️  Note: Underlying feed address not stored in addresses.ts\n');
  }

  // Fetch and verify current price
  console.log('💰 Current Price:');
  const priceData = await fetchUnderlyingPrice(provider, feedState, network);

  if (priceData) {
    const priceInBase9 = priceData.price;
    const priceNumber = Number(priceInBase9) / 1e9;
    const minPrice = BigInt(feedState.minPrice.toString());
    const maxPrice = BigInt(feedState.maxPrice.toString());
    const withinBounds = priceInBase9 >= minPrice && priceInBase9 <= maxPrice;

    console.log(`   Value: $${priceNumber.toFixed(9)}`);
    console.log(`   Raw (base-9): ${priceInBase9.toString()}`);
    console.log(`   Bounds Check: ${withinBounds ? '✅ Within limits' : '❌ Out of bounds'}\n`);

    // Summary
    console.log(`📈 Feed Health: ${withinBounds ? '✅ Healthy' : '⚠️  Out of bounds'}\n`);
  } else {
    console.log(`   ℹ️  Price fetching not implemented for ${mode} mode\n`);
  }

  console.log('✅ Feed verification completed!\n');
}

const network = getNetwork();
executeNetworkScript(network, main);

// Usage:
// Payment token feed: yarn tsx scripts/local-test-utils/verify-feed.ts --network devnet --payment-token USDC
// mToken feed:        yarn tsx scripts/local-test-utils/verify-feed.ts --network devnet --mtoken mTBILL
