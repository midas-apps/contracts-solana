import { AnchorProvider, Wallet } from '@coral-xyz/anchor';

import { executeNetworkScript } from '@/common/scriptRunner';
import { MProduct } from '@/common/tokenTypes';
import { fromBN } from '@/test/helpers/common.helpers';
import {
  fetchAllMinterVaultRequests,
  fetchAllRedeemerVaultRequests,
  fetchPaymentMintState,
  getPaymentMintStatePda,
} from '@/test/helpers/vaults.helpers';

import { getVaultsProgram } from '../deploy/vaults';
import { requireMinterVault, requireRedeemerVault } from '../utils/addressValidators';
import { getMtoken, getNetwork, getOptionalArg } from '../utils/argumentParser';

interface MinterRequestData {
  id: bigint;
  user: string;
  paymentMint: string;
  depositedUsd: bigint;
  depositedUsdWoFees: bigint;
  mMintRate: bigint;
  paymentMintDecimals?: number;
  paymentMintSymbol?: string;
  dataFeed?: string;
}

interface RedeemerRequestData {
  id: bigint;
  user: string;
  paymentMint: string;
  mTokenAmount: bigint;
  mTokenRate: bigint;
  paymentMintRate: bigint;
  paymentMintDecimals?: number;
  paymentMintSymbol?: string;
  dataFeed?: string;
  calculatedPaymentAmount?: bigint;
  availableAllowance?: bigint;
  canBeApproved?: boolean;
}

async function getMintRequests(
  provider: AnchorProvider,
  mtoken: MProduct,
  network: string,
): Promise<MinterRequestData[]> {
  try {
    const vaultCommon = requireMinterVault(network, mtoken);
    const vaultsProgram = getVaultsProgram(provider);

    const requests = await fetchAllMinterVaultRequests(vaultsProgram, vaultCommon, true);

    const requestsData: MinterRequestData[] = [];

    for (const { id, state } of requests) {
      if (!state) continue;

      // Try to get payment mint details
      try {
        const paymentMintStatePda = getPaymentMintStatePda(vaultCommon, state.paymentMint);
        const paymentMintState = await fetchPaymentMintState(
          vaultsProgram,
          paymentMintStatePda,
          true,
        );

        requestsData.push({
          id,
          user: state.user.toBase58(),
          paymentMint: state.paymentMint.toBase58(),
          depositedUsd: fromBN(state.depositedUsd),
          depositedUsdWoFees: fromBN(state.depositedUsdWoFees),
          mMintRate: fromBN(state.mMintRate),
          dataFeed: paymentMintState?.dataFeed?.toBase58(),
        });
      } catch {
        requestsData.push({
          id,
          user: state.user.toBase58(),
          paymentMint: state.paymentMint.toBase58(),
          depositedUsd: fromBN(state.depositedUsd),
          depositedUsdWoFees: fromBN(state.depositedUsdWoFees),
          mMintRate: fromBN(state.mMintRate),
        });
      }
    }

    return requestsData;
  } catch {
    console.log(`⚠️  No minter vault found for ${mtoken} on ${network}`);
    return [];
  }
}

async function getRedeemRequests(
  provider: AnchorProvider,
  mtoken: MProduct,
  network: string,
): Promise<RedeemerRequestData[]> {
  try {
    const vaultCommon = requireRedeemerVault(network, mtoken);
    const vaultsProgram = getVaultsProgram(provider);

    const requests = await fetchAllRedeemerVaultRequests(vaultsProgram, vaultCommon, true);

    const requestsData: RedeemerRequestData[] = [];

    for (const { id, state } of requests) {
      if (!state) continue;

      // Try to get payment mint details and calculate if can be approved
      try {
        const paymentMintStatePda = getPaymentMintStatePda(vaultCommon, state.paymentMint);
        const paymentMintState = await fetchPaymentMintState(
          vaultsProgram,
          paymentMintStatePda,
          true,
        );

        const mTokenAmount = fromBN(state.mTokenAmount);
        const storedPaymentMintRate = fromBN(state.paymentMintRate);

        // Simulate with a rate of 1.0 (typical for stablecoins)
        const simulatedNewRate = 1000000000n;
        const calculatedPaymentAmount = (mTokenAmount * simulatedNewRate) / storedPaymentMintRate;
        const availableAllowance = paymentMintState ? fromBN(paymentMintState.allowance) : 0n;
        const canBeApproved = calculatedPaymentAmount <= availableAllowance;

        requestsData.push({
          id,
          user: state.user.toBase58(),
          paymentMint: state.paymentMint.toBase58(),
          mTokenAmount: fromBN(state.mTokenAmount),
          mTokenRate: fromBN(state.mTokenRate),
          paymentMintRate: fromBN(state.paymentMintRate),
          dataFeed: paymentMintState?.dataFeed?.toBase58(),
          calculatedPaymentAmount,
          availableAllowance,
          canBeApproved,
        });
      } catch {
        requestsData.push({
          id,
          user: state.user.toBase58(),
          paymentMint: state.paymentMint.toBase58(),
          mTokenAmount: fromBN(state.mTokenAmount),
          mTokenRate: fromBN(state.mTokenRate),
          paymentMintRate: fromBN(state.paymentMintRate),
        });
      }
    }

    return requestsData;
  } catch {
    console.log(`⚠️  No redeemer vault found for ${mtoken} on ${network}`);
    return [];
  }
}

function displayMintRequests(requests: MinterRequestData[]) {
  if (requests.length === 0) {
    console.log('  No active mint requests found.\n');
    return;
  }

  console.log(`  Found ${requests.length} active mint request(s):\n`);

  for (const req of requests) {
    console.log(`  ┌─ Mint Request #${req.id}`);
    console.log(`  │  User:                   ${req.user}`);
    console.log(`  │  Payment Mint:           ${req.paymentMint}`);
    console.log(`  │  Deposited USD:          ${req.depositedUsd}`);
    console.log(`  │  Deposited USD (no fees): ${req.depositedUsdWoFees}`);
    console.log(`  │  mMint Rate:             ${req.mMintRate} (${Number(req.mMintRate) / 1e9})`);
    if (req.dataFeed) {
      console.log(`  │  Data Feed:              ${req.dataFeed}`);
    }
    console.log(`  └─\n`);
  }
}

function displayRedeemRequests(requests: RedeemerRequestData[]) {
  if (requests.length === 0) {
    console.log('  No active redeem requests found.\n');
    return;
  }

  console.log(`  Found ${requests.length} active redeem request(s):\n`);

  for (const req of requests) {
    console.log(`  ┌─ Redeem Request #${req.id}`);
    console.log(`  │  User:                      ${req.user}`);
    console.log(`  │  Payment Mint:              ${req.paymentMint}`);
    console.log(`  │  mToken Amount:             ${req.mTokenAmount}`);
    console.log(
      `  │  mToken Rate:               ${req.mTokenRate} (${Number(req.mTokenRate) / 1e9})`,
    );
    console.log(
      `  │  Payment Mint Rate:         ${req.paymentMintRate} (${Number(req.paymentMintRate) / 1e9})`,
    );
    if (req.dataFeed) {
      console.log(`  │  Data Feed:                 ${req.dataFeed}`);
    }
    if (req.calculatedPaymentAmount !== undefined) {
      console.log(`  │  Calculated Payment Amount: ${req.calculatedPaymentAmount}`);
    }
    if (req.availableAllowance !== undefined) {
      console.log(`  │  Available Allowance:       ${req.availableAllowance}`);
    }
    if (req.canBeApproved !== undefined) {
      console.log(`  │  Can Be Approved:           ${req.canBeApproved ? '✅ YES' : '❌ NO'}`);
      if (!req.canBeApproved) {
        const shortage = req.calculatedPaymentAmount! - req.availableAllowance!;
        console.log(`  │  Allowance Shortage:        ${shortage}`);
      }
    }
    console.log(`  └─\n`);
  }
}

async function main(provider: AnchorProvider, _payer: Wallet) {
  const mtoken = getMtoken();
  const network = getNetwork();
  const requestType = getOptionalArg('type'); // 'mint', 'redeem', or undefined for both

  console.log(`\n${'='.repeat(80)}`);
  console.log(`  GET ALL REQUESTS - ${mtoken} on ${network.toUpperCase()}`);
  console.log(`${'='.repeat(80)}\n`);

  if (!requestType || requestType === 'mint') {
    console.log(`\n📥 MINT REQUESTS (Deposits)\n`);
    const mintRequests = await getMintRequests(provider, mtoken, network);
    displayMintRequests(mintRequests);
  }

  if (!requestType || requestType === 'redeem') {
    console.log(`\n📤 REDEEM REQUESTS (Withdrawals)\n`);
    const redeemRequests = await getRedeemRequests(provider, mtoken, network);
    displayRedeemRequests(redeemRequests);
  }

  console.log(`${'='.repeat(80)}\n`);
  console.log(`💡 Tips:`);
  console.log(`   • Use --type mint to show only mint requests`);
  console.log(`   • Use --type redeem to show only redeem requests`);
  console.log(
    `   • Use verify-redeem-request.ts for detailed analysis of a specific redeem request`,
  );
  console.log(`   • Request rates are shown in raw format and normalized (÷ 1e9)\n`);
}

const network = getNetwork();
executeNetworkScript(network, main);

// Usage:
// Get all requests (mint + redeem):
// yarn tsx scripts/verify/get-all-requests.ts --network devnet --mtoken mTBILL
//
// Get only mint requests:
// yarn tsx scripts/verify/get-all-requests.ts --network devnet --mtoken mTBILL --type mint
//
// Get only redeem requests:
// yarn tsx scripts/verify/get-all-requests.ts --network devnet --mtoken mTBILL --type redeem
