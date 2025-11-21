import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import {
  createApproveInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
  getMint,
} from '@solana/spl-token';
import { Keypair, Transaction } from '@solana/web3.js';

import { createUserError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';
import { loadWallet } from '@/common/wallet';
import { createAtaIfNotExistsInx, parseUnits } from '@/test/helpers/common.helpers';
import { fetchRedeemerVaultState, getRedeemerVaultPda } from '@/test/helpers/vaults.helpers';

import { getVaultsProgram } from '../../deploy/vaults';
import { requirePaymentTokenFeed, requireRedeemerVault } from '../../utils/addressValidators';
import { getMtoken, getNetwork, getOptionalArg, getPaymentToken } from '../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Wallet) {
  const mtoken = getMtoken();
  const network = getNetwork();
  const paymentToken = getPaymentToken();
  const amountStr = getOptionalArg('amount');

  if (!amountStr) {
    throw createUserError('--amount parameter is required', [
      'Example: --amount 10000 (for 10,000 USDC)',
    ]);
  }

  console.log(`\n=== Funding Redeemer for ${mtoken} with ${paymentToken} ===\n`);

  // Get addresses
  const vaultCommon = requireRedeemerVault(network, mtoken);
  const feedAddr = requirePaymentTokenFeed(network, paymentToken, mtoken);

  const vaultsProgram = getVaultsProgram(provider);

  // Fetch redeemer vault state
  const redeemerVaultPda = getRedeemerVaultPda(vaultCommon);
  const redeemerVault = await fetchRedeemerVaultState(vaultsProgram, redeemerVaultPda);

  console.log(`📋 Vault Configuration:`);
  console.log(`  Vault Common: ${vaultCommon.toBase58()}`);
  console.log(`  Redeemer Vault PDA: ${redeemerVaultPda.toBase58()}`);
  console.log(`  Request Redeemer: ${redeemerVault.requestRedeemer.toBase58()}`);
  console.log(`  Payment Token: ${feedAddr.token.toBase58()}`);

  // Get payment mint info
  const paymentMintData = await getMint(
    provider.connection,
    feedAddr.token,
    undefined,
    feedAddr.tokenProgram,
  );
  const paymentDecimals = paymentMintData.decimals;

  // Parse amount (ensure amountStr is a string)
  const amount = parseUnits(String(amountStr), paymentDecimals);
  console.log(`\n💰 Amount to approve: ${amountStr} (${amount} in base units)`);

  // Get redeemer's ATA
  const redeemerAta = getAssociatedTokenAddressSync(
    feedAddr.token,
    redeemerVault.requestRedeemer,
    true,
    feedAddr.tokenProgram,
  );

  // Check current balance and approval
  const redeemerTokenAccount = await getAccount(
    provider.connection,
    redeemerAta,
    undefined,
    feedAddr.tokenProgram,
  );

  console.log(`\n📊 Current State:`);
  console.log(`  Balance: ${redeemerTokenAccount.amount}`);
  console.log(`  Delegate: ${redeemerTokenAccount.delegate?.toBase58() || 'None'}`);
  console.log(`  Delegated Amount: ${redeemerTokenAccount.delegatedAmount}`);

  const hasCorrectDelegate = redeemerTokenAccount.delegate?.equals(redeemerVaultPda);
  const hasSufficientApproval = redeemerTokenAccount.delegatedAmount >= amount;

  if (hasCorrectDelegate && hasSufficientApproval) {
    console.log(`\n✅ Redeemer already has sufficient approval!`);
    console.log(`   No action needed.`);
    return;
  }

  if (redeemerTokenAccount.amount < amount) {
    throw createUserError('Redeemer has insufficient balance and --skip-mint is enabled', [
      `Balance: ${redeemerTokenAccount.amount}`,
      `Required: ${amount}`,
      'Either fund the redeemer manually or remove --skip-mint flag',
    ]);
  }

  // Load redeemer keypair if provided (needed for approval)
  const redeemerKeypair = loadWallet('~/.config/solana/midas_id.json');
  if (!redeemerKeypair.publicKey.equals(redeemerVault.requestRedeemer)) {
    throw createUserError(`Redeemer keypair mismatch!`, [
      `Expected: ${redeemerVault.requestRedeemer.toBase58()}`,
      `Got: ${redeemerKeypair.publicKey.toBase58()}`,
    ]);
  }

  // Build transaction
  const tx = new Transaction();

  // Create ATA if needed
  const createAtaInx = await createAtaIfNotExistsInx(
    provider.connection,
    feedAddr.token,
    redeemerVault.requestRedeemer,
    payer,
    feedAddr.tokenProgram,
  );
  if (createAtaInx) {
    console.log(`\n📝 Creating ATA for redeemer`);
    tx.add(createAtaInx);
  }

  // Add approve instruction
  console.log(`\n✅ Adding approve instruction`);
  console.log(`   Approving ${amount} tokens from redeemer to vault PDA`);

  tx.add(
    createApproveInstruction(
      redeemerAta,
      redeemerVaultPda,
      redeemerKeypair.publicKey,
      amount,
      undefined,
      feedAddr.tokenProgram,
    ),
  );

  // Send transaction - redeemerKeypair must sign in addition to payer
  console.log(`\n📤 Sending transaction...`);
  const additionalSigners: Keypair[] = [redeemerKeypair];
  const txRes = await provider.sendAndConfirm(tx, additionalSigners, {
    commitment: 'finalized',
  });

  console.log(`\n✅ Redeemer funded and approved successfully!`);
  console.log(`Transaction: ${txRes}`);
  console.log(`\nThe redeemer can now fulfill redemptions up to ${amountStr} ${paymentToken}`);
}

const network = getNetwork();
executeNetworkScript(network, main, 'update-vault');

// Usage examples:
//
// Fund redeemer with 10,000 USDC and approve to vault (devnet - with minting):
// yarn tsx scripts/tasks/manage/fund-redeemer.ts --network devnet --mtoken mTBILL --payment-token USDC --amount 10000 --redeemer-keypair ./redeemer.json
//
// Only approve existing balance (skip minting):
// yarn tsx scripts/tasks/manage/fund-redeemer.ts --network devnet --mtoken mTBILL --payment-token USDC --amount 10000 --redeemer-keypair ./redeemer.json --skip-mint true
//
// For mainnet, you'll need to fund the redeemer manually first, then use --skip-mint true
