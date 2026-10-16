import { AnchorProvider, Wallet } from '@coral-xyz/anchor';

import { executeNetworkScript } from '@/common/scriptRunner';
import { fromBN } from '@/test/helpers/common.helpers';
import { fetchDataFeedState } from '@/test/helpers/data-feed.helpers';
import {
  fetchAllRedeemerVaultRequests,
  fetchPaymentMintState,
  fetchRedeemerVaultRequestState,
  fetchRedeemerVaultState,
  fetchVaultCommonState,
  getPaymentMintStatePda,
  getRedeemerVaultPda,
  getRedeemerVaultRequestPda,
} from '@/test/helpers/vaults.helpers';

import { getDataFeedProgram } from '../deploy/dataFeed';
import { getVaultsProgram } from '../deploy/vaults';
import { requirePaymentTokenFeed, requireRedeemerVault } from '../utils/addressValidators';
import { getMtoken, getNetwork, getOptionalArg, getPaymentToken } from '../utils/argumentParser';

async function main(provider: AnchorProvider, _payer: Wallet) {
  const mtoken = getMtoken();
  const network = getNetwork();
  const paymentToken = getPaymentToken();
  const requestIdArg = (() => {
    const arg = getOptionalArg('request-id');
    return arg ? BigInt(arg) : undefined;
  })();

  console.log(`\n=== Verifying Redeem Request for ${mtoken} with ${paymentToken} ===\n`);

  // Get addresses
  const vaultCommon = requireRedeemerVault(network, mtoken);
  const feedAddr = requirePaymentTokenFeed(network, paymentToken, mtoken);

  const vaultsProgram = getVaultsProgram(provider);
  const feedProgram = getDataFeedProgram(provider);

  // Fetch vault common state
  const commonState = await fetchVaultCommonState(vaultsProgram, vaultCommon);
  const requestsCount = fromBN(commonState.requestsCount);

  console.log(`📊 Vault Common State:`);
  console.log(`  Total requests: ${requestsCount}`);
  console.log(`  mMint: ${commonState.mMint.toBase58()}`);

  // Find request ID if not provided
  let requestId: bigint;
  if (requestIdArg !== undefined) {
    requestId = requestIdArg;
  } else {
    if (requestsCount === 0n) {
      throw new Error('No redeem requests found');
    }

    // Fetch all active requests
    const allRequests = await fetchAllRedeemerVaultRequests(vaultsProgram, vaultCommon, true);

    if (allRequests.length === 0) {
      throw new Error('No pending redeem requests found');
    }

    // Get the latest request
    requestId = allRequests[allRequests.length - 1].id;
    console.log(`\n✅ Found latest request ID: ${requestId}`);
    console.log(`📊 Total active requests: ${allRequests.length}`);
  }

  // Fetch redeem request state
  const redeemerVaultPda = getRedeemerVaultPda(vaultCommon);
  const requestPda = getRedeemerVaultRequestPda(redeemerVaultPda, requestId);
  const redeemRequest = await fetchRedeemerVaultRequestState(vaultsProgram, requestPda, false);

  if (!redeemRequest) {
    throw new Error(`Redeem request ${requestId} not found`);
  }

  console.log(`\n📝 Redeem Request #${requestId} Details:`);
  console.log(`  User: ${redeemRequest.user.toBase58()}`);
  console.log(`  Payment mint: ${redeemRequest.paymentMint.toBase58()}`);
  console.log(`  mToken amount: ${fromBN(redeemRequest.mTokenAmount)}`);
  console.log(
    `  mToken rate (stored): ${fromBN(redeemRequest.mTokenRate)} (raw: ${redeemRequest.mTokenRate})`,
  );
  console.log(
    `  Payment mint rate (stored): ${fromBN(redeemRequest.paymentMintRate)} (raw: ${redeemRequest.paymentMintRate})`,
  );

  // Fetch current payment mint state and feed
  const paymentMintState = await fetchPaymentMintState(
    vaultsProgram,
    getPaymentMintStatePda(vaultCommon, feedAddr.token),
  );
  console.log(`\n💰 Payment Mint State (${paymentToken}):`);
  console.log(
    `  Allowance: ${fromBN(paymentMintState.allowance)} (raw: ${paymentMintState.allowance})`,
  );
  console.log(`  Data feed: ${paymentMintState.dataFeed.toBase58()}`);
  console.log(`  Is stable: ${paymentMintState.stable}`);

  // Fetch current payment token feed rate
  const paymentFeed = await fetchDataFeedState(feedProgram, paymentMintState.dataFeed);
  console.log(`\n📡 Payment Token Feed:`);
  console.log(`  Underlying feed: ${paymentFeed.underlyingFeed.toBase58()}`);
  console.log(`  Mode: ${JSON.stringify(paymentFeed.mode)}`);

  // Try to get current rate from feed (this might fail if feed needs update)
  try {
    // We can't directly call get_token_rate from TypeScript, but we can simulate the calculation
    console.log('\n⚠️  Note: To get the current live rate, you would need to call the contract');
  } catch (error) {
    console.log('\n❌ Could not fetch current rate:', error);
  }

  // Fetch redeemer vault state
  const redeemerVault = await fetchRedeemerVaultState(vaultsProgram, redeemerVaultPda);
  console.log(`\n🏦 Redeemer Vault State:`);
  console.log(`  Request redeemer: ${redeemerVault.requestRedeemer.toBase58()}`);

  // Calculate what payment amount would be needed
  const mTokenAmount = fromBN(redeemRequest.mTokenAmount);
  const storedPaymentMintRate = fromBN(redeemRequest.paymentMintRate);

  console.log(`\n🔢 Calculation Analysis:`);
  console.log(
    `  Formula: payment_amount = (mToken_amount × new_mToken_rate) / stored_payment_mint_rate`,
  );
  console.log(`  mToken amount: ${mTokenAmount}`);
  console.log(`  Stored payment mint rate: ${storedPaymentMintRate}`);

  // Simulate with a rate of 1.0 (1000000000 with 9 decimals)
  const newRate = 1000000000n;
  const calculatedPaymentAmount = (mTokenAmount * newRate) / storedPaymentMintRate;
  console.log(`\n  If new_mToken_rate = ${newRate} (1.0 with 9 decimals):`);
  console.log(`  Required payment amount = ${calculatedPaymentAmount}`);
  console.log(`  Available allowance = ${fromBN(paymentMintState.allowance)}`);
  console.log(
    `  Sufficient? ${calculatedPaymentAmount <= fromBN(paymentMintState.allowance) ? '✅ YES' : '❌ NO'}`,
  );

  // Calculate what the payment_mint_rate should have been
  const expectedPaymentMintRate = 1000000000n; // $1.00 for USDC
  if (storedPaymentMintRate !== expectedPaymentMintRate) {
    console.log(`\n⚠️  WARNING: Payment mint rate mismatch!`);
    console.log(`  Expected rate for $1 stablecoin: ${expectedPaymentMintRate}`);
    console.log(`  Stored rate in request: ${storedPaymentMintRate}`);
    console.log(`  Difference: ${expectedPaymentMintRate / storedPaymentMintRate}x`);
  }

  // Provide recommendations
  console.log(`\n📋 Recommendations:`);

  if (storedPaymentMintRate < 1000000n) {
    console.log(`\n❌ The stored payment_mint_rate (${storedPaymentMintRate}) is incorrect!`);
    console.log(
      `   This was likely caused by an incorrect price feed value when the request was created.`,
    );
    console.log(`\n   Options to fix:`);
    console.log(
      `   1. Reject this request and have the user create a new one after fixing the price feed`,
    );
    console.log(`   2. Increase the redeemer's allowance to accommodate the miscalculation`);
    console.log(`   3. Fix the price feed first, then handle future requests correctly`);

    // Calculate required allowance increase
    const currentAllowance = fromBN(paymentMintState.allowance);
    const requiredAllowance = calculatedPaymentAmount;
    const additionalAllowanceNeeded = requiredAllowance - currentAllowance;

    console.log(`\n   To approve this request, you would need to:`);
    console.log(`   - Increase allowance by: ${additionalAllowanceNeeded}`);
    console.log(`   - Run: yarn tsx scripts/tasks/manage/update-redeemer-vault.ts \\`);
    console.log(
      `           --network ${network} --mtoken ${mtoken} --payment-token ${paymentToken} \\`,
    );
    console.log(
      `           --allowance ${requiredAllowance + 1000000000000000n} # Add some buffer`,
    );
  } else {
    console.log(`✅ Payment mint rate looks correct`);
    console.log(`   You should be able to approve this request with:`);
    console.log(`   yarn tsx scripts/approve-redeem-request.ts \\`);
    console.log(`     --network ${network} --mtoken ${mtoken} --payment-token ${paymentToken} \\`);
    console.log(`     --request-id ${requestId} --new-rate ${newRate} --is-safe true`);
  }
}

const network = getNetwork();
executeNetworkScript(network, main);

// Usage:
// yarn tsx scripts/verify/verify-redeem-request.ts --network devnet --mtoken mTBILL --payment-token USDC --request-id 0
