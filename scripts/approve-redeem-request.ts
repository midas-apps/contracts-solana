import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import {
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import { Transaction } from '@solana/web3.js';

import { executeNetworkScript } from '@/common/scriptRunner';
import { VAULT_AC_ROLES } from '@/test/constants/vaults.constants';
import { getAccountAcRoleStatePda } from '@/test/helpers/ac.helpers';
import { createAtaIfNotExistsInx, fromBN, toBN } from '@/test/helpers/common.helpers';
import {
  fetchRedeemerVaultRequestState,
  fetchRedeemerVaultState,
  fetchVaultCommonState,
  getPaymentMintStatePda,
  getRedeemerVaultPda,
  getRedeemerVaultRequestPda,
} from '@/test/helpers/vaults.helpers';

import { getVaultsProgram } from './deploy/vaults';
import { requirePaymentTokenFeed, requireRedeemerVault } from './utils/addressValidators';
import { getMtoken, getNetwork, getPaymentToken, getOptionalArg } from './utils/argumentParser';

async function main(provider: AnchorProvider, payer: Wallet) {
  const mtoken = getMtoken();
  const network = getNetwork();
  const paymentToken = getPaymentToken();
  const requestIdArg = (() => {
    const arg = getOptionalArg('request-id');
    return arg ? BigInt(arg) : undefined;
  })();
  const newRateStr = (() => {
    const arg = getOptionalArg('new-rate');
    if (!arg) return undefined;

    // Validate that the input is a valid base-9 integer
    const trimmed = arg.trim();
    if (!/^\d+$/.test(trimmed)) {
      throw new Error(
        `Invalid new-rate format: "${arg}". Expected a base-9 integer (e.g., "1000000000" for $1.00, "1150000000" for $1.15)`,
      );
    }

    try {
      const asBigInt = BigInt(trimmed);
      if (asBigInt < 0n) {
        throw new Error();
      }
    } catch {
      throw new Error(`Invalid new-rate value: "${arg}". Expected a positive base-9 integer.`);
    }

    return trimmed;
  })();
  const isSafe = (() => {
    const arg = getOptionalArg('is-safe');
    if (!arg) return false;
    const lower = arg.toLowerCase();
    return lower === 'true' || lower === '1' || lower === 'yes';
  })();

  console.log(`Approving redeem request for ${mtoken} tokens with payment token ${paymentToken}`);
  if (requestIdArg !== undefined) {
    console.log(`Request ID: ${requestIdArg}`);
  }
  if (newRateStr) {
    console.log(`New rate (base-9 input): ${newRateStr} (e.g., "1000000000" = $1.00)`);
  }
  console.log(`Is safe: ${isSafe}`);

  // Get token addresses
  const vaultCommon = requireRedeemerVault(network, mtoken);

  // Get payment token feed address
  const feedAddr = requirePaymentTokenFeed(network, paymentToken, mtoken);

  const vaultsProgram = getVaultsProgram(provider);

  // Fetch vault common state to get requests_count
  const commonState = await fetchVaultCommonState(vaultsProgram, vaultCommon);

  // Find request ID if not provided
  let requestId: bigint;
  if (requestIdArg !== undefined) {
    requestId = requestIdArg;
  } else {
    // Iterate backwards from requests_count - 1 to find the first existing request
    const requestsCount = fromBN(commonState.requestsCount);
    if (requestsCount === 0n) {
      throw new Error('No redeem requests found');
    }

    let found = false;
    for (let i = requestsCount - 1n; i >= 0n; i--) {
      const requestPda = getRedeemerVaultRequestPda(getRedeemerVaultPda(vaultCommon), i);
      const requestState = await fetchRedeemerVaultRequestState(vaultsProgram, requestPda, true);
      if (requestState) {
        requestId = i;
        found = true;
        console.log(`Found request ID: ${requestId}`);
        break;
      }
    }

    if (!found) {
      throw new Error('No pending redeem requests found');
    }
  }

  // Fetch redeem request state
  const redeemerVaultPda = getRedeemerVaultPda(vaultCommon);
  const requestPda = getRedeemerVaultRequestPda(redeemerVaultPda, requestId);
  const redeemRequest = await fetchRedeemerVaultRequestState(vaultsProgram, requestPda, false);

  if (!redeemRequest) {
    throw new Error(`Redeem request ${requestId} not found`);
  }

  console.log(`Request details:`);
  console.log(`  User: ${redeemRequest.user.toBase58()}`);
  console.log(`  Payment mint: ${redeemRequest.paymentMint.toBase58()}`);
  console.log(`  mToken amount: ${fromBN(redeemRequest.mTokenAmount)}`);

  // Verify payment mint matches
  if (!redeemRequest.paymentMint.equals(feedAddr.token)) {
    throw new Error(
      `Payment mint mismatch: request uses ${redeemRequest.paymentMint.toBase58()}, but provided payment token is ${feedAddr.token.toBase58()}`,
    );
  }

  // Fetch redeemer vault state
  const redeemerVault = await fetchRedeemerVaultState(vaultsProgram, redeemerVaultPda);

  // Fetch payment mint to get decimals
  const paymentMintData = await getMint(
    provider.connection,
    feedAddr.token,
    undefined,
    feedAddr.tokenProgram,
  );
  const paymentMintDecimals = paymentMintData.decimals;

  // Determine new rate (use provided rate or request's rate)
  // mToken rate uses 9 decimals precision (e.g., 1.0 USD = 1_000_000_000)
  const newRate = newRateStr ? BigInt(newRateStr) : fromBN(redeemRequest.mTokenRate);

  console.log(`\n🔍 Transaction Parameters:`);
  console.log(`  Request ID: ${requestId}`);
  if (newRateStr) {
    console.log(`  New rate (base-9): ${newRate}`);
    console.log(`  New rate (decimal): $${Number(newRate) / 1e9}`);
  } else {
    console.log(`  New rate (base-9): ${newRate} (using stored rate from request)`);
  }
  console.log(`  Is safe: ${isSafe}`);
  console.log(`  mToken amount in request: ${fromBN(redeemRequest.mTokenAmount)}`);
  console.log(`  Stored mToken rate (base-9): ${fromBN(redeemRequest.mTokenRate)}`);
  console.log(`  Stored payment mint rate (base-9): ${fromBN(redeemRequest.paymentMintRate)}`);
  console.log(`  Payment mint decimals: ${paymentMintDecimals}`);

  // Calculate expected payment amount
  const expectedPaymentAmount =
    (fromBN(redeemRequest.mTokenAmount) * newRate) / fromBN(redeemRequest.paymentMintRate);
  console.log(`  Expected payment amount (before truncate): ${expectedPaymentAmount}`);

  // Simulate truncate operation
  const fromBase9 = expectedPaymentAmount / BigInt(10 ** (9 - paymentMintDecimals));
  const backToBase9 = fromBase9 * BigInt(10 ** (9 - paymentMintDecimals));
  console.log(`  After truncate to ${paymentMintDecimals} decimals: ${backToBase9}`);

  // Check if redeemer has approved tokens to vault PDA
  const paymentMintRedeemerAta = getAssociatedTokenAddressSync(
    feedAddr.token,
    redeemerVault.requestRedeemer,
    true,
    feedAddr.tokenProgram,
  );

  try {
    const redeemerTokenAccount = await getAccount(
      provider.connection,
      paymentMintRedeemerAta,
      undefined,
      feedAddr.tokenProgram,
    );

    const hasApproval = redeemerTokenAccount.delegate?.equals(redeemerVaultPda);
    const approvedAmount = redeemerTokenAccount.delegatedAmount;

    console.log(`\n🔐 Redeemer Delegate Status:`);
    console.log(`  Redeemer: ${redeemerVault.requestRedeemer.toBase58()}`);
    console.log(`  Delegate: ${redeemerTokenAccount.delegate?.toBase58() || 'None'}`);
    console.log(`  Approved amount: ${approvedAmount}`);
    console.log(`  Required amount: ${backToBase9}`);
    console.log(
      `  Has sufficient approval: ${hasApproval && approvedAmount >= backToBase9 ? '✅ YES' : '❌ NO'}`,
    );

    if (!hasApproval || approvedAmount < backToBase9) {
      console.log(`\n⚠️  ERROR: The redeemer hasn't approved sufficient tokens to the vault PDA!`);
      console.log(`\n   The redeemer (${redeemerVault.requestRedeemer.toBase58()}) must approve`);
      console.log(`   ${backToBase9} tokens to the vault PDA (${redeemerVaultPda.toBase58()})`);
      console.log(`\n   To fix this, the redeemer needs to run:`);
      console.log(
        `   spl-token approve ${feedAddr.token.toBase58()} ${backToBase9} ${redeemerVaultPda.toBase58()} \\`,
      );
      console.log(
        `     --owner <REDEEMER_KEYPAIR> --url ${network === 'mainnet' ? 'mainnet-beta' : 'devnet'}`,
      );
      throw new Error('Insufficient token approval from redeemer');
    }
  } catch (error) {
    if (error instanceof Error && error.message?.includes('could not find account')) {
      console.log(`\n❌ ERROR: Redeemer doesn't have a payment token account!`);
      console.log(`   The redeemer needs to create an ATA and fund it with ${backToBase9} tokens`);
    }
    throw error;
  }

  // Get all required ATAs
  const paymentMintUserAta = getAssociatedTokenAddressSync(
    feedAddr.token,
    redeemRequest.user,
    true,
    feedAddr.tokenProgram,
  );
  // paymentMintRedeemerAta already declared above for approval check
  const mMintVaultAta = getAssociatedTokenAddressSync(
    commonState.mMint,
    redeemerVaultPda,
    true,
    TOKEN_2022_PROGRAM_ID,
  );

  // Get authority AC role PDA
  const authorityAcRole = getAccountAcRoleStatePda(
    commonState.acRole,
    payer.publicKey,
    VAULT_AC_ROLES.VAULT_ADMIN,
  );

  // Create transaction
  const tx = new Transaction();

  // Create missing ATAs
  const paymentMintUserAtaInx = await createAtaIfNotExistsInx(
    provider.connection,
    feedAddr.token,
    redeemRequest.user,
    payer,
    feedAddr.tokenProgram,
  );
  if (paymentMintUserAtaInx) {
    console.log('Creating payment token ATA for user');
    tx.add(paymentMintUserAtaInx);
  }

  const paymentMintRedeemerAtaInx = await createAtaIfNotExistsInx(
    provider.connection,
    feedAddr.token,
    redeemerVault.requestRedeemer,
    payer,
    feedAddr.tokenProgram,
  );
  if (paymentMintRedeemerAtaInx) {
    console.log('Creating payment token ATA for redeemer');
    tx.add(paymentMintRedeemerAtaInx);
  }

  const mMintVaultAtaInx = await createAtaIfNotExistsInx(
    provider.connection,
    commonState.mMint,
    redeemerVaultPda,
    payer,
    TOKEN_2022_PROGRAM_ID,
  );
  if (mMintVaultAtaInx) {
    console.log('Creating mToken ATA for vault');
    tx.add(mMintVaultAtaInx);
  }

  // Add approve instruction
  tx.add(
    await vaultsProgram.methods
      .approveRedeemRequest(toBN(requestId), toBN(newRate), isSafe)
      .accountsPartial({
        authority: payer.publicKey,
        userAccount: redeemRequest.user,
        requestRedeemer: redeemerVault.requestRedeemer,
        vaultCommon: vaultCommon,
        authorityAcRole: authorityAcRole,
        redeemerVault: redeemerVaultPda,
        paymentMintState: getPaymentMintStatePda(vaultCommon, feedAddr.token),
        redeemRequest: requestPda,
        paymentMintUserAta: paymentMintUserAta,
        paymentMint: feedAddr.token,
        paymentMintRedeemerAta: paymentMintRedeemerAta,
        mMintVaultAta: mMintVaultAta,
        mMint: commonState.mMint,
        mMintTokenProgram: TOKEN_2022_PROGRAM_ID,
        paymentMintTokenProgram: feedAddr.tokenProgram,
      })
      .instruction(),
  );

  const txRes = await provider.sendAndConfirm(tx, [], {
    commitment: 'finalized',
  });

  console.log(`✅ Redeem request approved successfully`);
  console.log(`Transaction: ${txRes}`);
}

const network = getNetwork();
executeNetworkScript(network, main);

// Usage examples:
// yarn tsx scripts/approve-redeem-request.ts --network devnet --mtoken mTBILL --payment-token USDC --request-id 0 --new-rate 1000000000 --is-safe true
// yarn tsx scripts/approve-redeem-request.ts --network devnet --mtoken mTBILL --payment-token USDC --request-id 0 --new-rate 1150000000 --is-safe false
//
// Note: --new-rate should be a base-9 integer (e.g., "1000000000" for $1.00, "1150000000" for $1.15)
