import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

import { executeNetworkScript } from '@/common/scriptRunner';
import { getVaultsProgram } from '@/scripts/deploy/vaults';
import { getTokenAddresses } from '@/scripts/utils/addressQueries';
import { requireMinterVault, requireRedeemerVault } from '@/scripts/utils/addressValidators';
import { DEFAULT_PUBKEY } from '@/test/constants/common.constants';
import { VAULTS_PROGRAM_ID } from '@/test/constants/vaults.constants';
import { getPaymentMintStatePda } from '@/test/helpers/vaults.helpers';

import { getMtoken, getNetwork } from '../utils/argumentParser';

type VaultType = 'minter' | 'redeemer';

interface PaymentTokenState {
  exists: boolean;
  mint: PublicKey;
  fee?: string;
  allowance?: string;
  stable?: boolean;
  dataFeed?: PublicKey;
}

async function getAllPaymentTokensForVault(
  provider: AnchorProvider,
  vaultCommon: PublicKey,
): Promise<PaymentTokenState[]> {
  const vaultsProgram = getVaultsProgram(provider);
  const connection = provider.connection;

  // PaymentMintState accounts are PDAs with seeds: [b"payment_mint", vault_common, payment_mint]
  // We'll fetch all accounts owned by the vaults program and filter for PaymentMintState accounts
  // that belong to this vault_common by verifying the PDA derivation

  // PaymentMintState size: discriminator (8) + mint (32) + data_feed (32) + fee (8) + allowance (16) + stable (1)
  const paymentMintStateSize = 8 + 32 + 32 + 8 + 16 + 1;

  const accounts = await connection.getProgramAccounts(VAULTS_PROGRAM_ID, {
    filters: [
      {
        dataSize: paymentMintStateSize,
      },
    ],
  });

  const paymentTokens: PaymentTokenState[] = [];

  for (const accountInfo of accounts) {
    try {
      // Parse the account data
      const account = await vaultsProgram.account.paymentMintState.fetch(accountInfo.pubkey);
      if (!account) continue;

      // Verify this account belongs to our vault_common by deriving the expected PDA
      const expectedPda = getPaymentMintStatePda(vaultCommon, account.mint);

      // Only include if the account address matches the expected PDA
      if (accountInfo.pubkey.equals(expectedPda)) {
        paymentTokens.push({
          exists: true,
          mint: account.mint,
          fee: account.fee.toString(),
          allowance: account.allowance.toString(),
          stable: account.stable,
          dataFeed: account.dataFeed,
        });
      }
    } catch {
      // Skip accounts that don't parse correctly (they might be other account types)
      // Silently continue
    }
  }

  return paymentTokens;
}

async function main(provider: AnchorProvider, _payer: Wallet) {
  const mtoken = getMtoken();
  const network = getNetwork();

  console.log('\n🧪 Payment Token State Check (On-Chain)');
  console.log('=====================================');
  console.log(`MToken: ${mtoken}`);
  console.log(`Network: ${network}`);
  console.log('=====================================\n');

  // Get token addresses
  const tokenAddrs = getTokenAddresses(network, mtoken);
  if (!tokenAddrs) {
    throw new Error(`Token addresses not found for ${mtoken} on ${network}`);
  }

  // Always check both vaults
  const targetVaults: VaultType[] = ['minter', 'redeemer'];

  // Validate vaults exist
  requireMinterVault(network, mtoken);
  requireRedeemerVault(network, mtoken);

  // Check payment token state for each vault
  console.log('📋 Fetching payment tokens from on-chain vaults...');
  console.log('=====================================\n');

  for (const vaultType of targetVaults) {
    const vaultCommon =
      vaultType === 'minter' ? tokenAddrs.minter?.commonVault : tokenAddrs.redeemer?.commonVault;

    if (!vaultCommon) {
      throw new Error(`${vaultType} vault not found for ${mtoken} on ${network}`);
    }

    console.log(`${vaultType.toUpperCase()} Vault`);
    console.log(`  Vault Common: ${vaultCommon.toBase58()}\n`);

    // Fetch all payment tokens on-chain
    const paymentTokens = await getAllPaymentTokensForVault(provider, vaultCommon);

    if (paymentTokens.length === 0) {
      console.log(`  ⚠️  No payment tokens found on-chain\n`);
      continue;
    }

    console.log(`  Found ${paymentTokens.length} payment token(s) on-chain:\n`);

    // Display each payment token
    for (const token of paymentTokens) {
      const isFiat = token.mint.equals(DEFAULT_PUBKEY);

      console.log(`  Payment Token`);
      console.log(`    Mint: ${token.mint.toBase58()} ${isFiat ? '(FIAT)' : ''}`);
      console.log(`    ✅ EXISTS on-chain`);
      console.log(`    Fee: ${token.fee}`);
      console.log(`    Allowance: ${token.allowance}`);
      console.log(`    Stable: ${token.stable}`);
      if (token.dataFeed && !isFiat) {
        console.log(`    Data Feed: ${token.dataFeed.toBase58()}`);
      }
      console.log('');
    }
  }

  console.log('=====================================');
  console.log('✅ On-chain state check completed\n');
}

executeNetworkScript(getNetwork(), main, 'local-wallet');

// yarn tsx scripts/local-test-utils/verify-payment-tokens.ts --network devnet --mtoken mTBILL
