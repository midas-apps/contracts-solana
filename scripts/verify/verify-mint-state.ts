import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

import { executeNetworkScript } from '@/common/scriptRunner';
import { formatUnits, fromBN, getBalance } from '@/test/helpers/common.helpers';
import {
  fetchVaultCommonAccountState,
  fetchVaultCommonState,
  getCommonVaultAccountStatePda,
} from '@/test/helpers/vaults.helpers';

import { getVaultsProgram } from '../deploy/vaults';
import { requireMinterVault, requirePaymentTokenFeed } from '../utils/addressValidators';
import { getMtoken, getNetwork, getPaymentToken } from '../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Wallet) {
  const mtoken = getMtoken();
  const network = getNetwork();
  const paymentToken = getPaymentToken();

  console.log(`\n📊 Verifying Mint State`);
  console.log('==========================================');
  console.log(`Network: ${network}`);
  console.log(`MToken: ${mtoken}`);
  console.log(`Payment Token: ${paymentToken}`);
  console.log(`User: ${payer.publicKey.toBase58()}`);
  console.log('==========================================\n');

  // Get token addresses
  const vaultCommon = requireMinterVault(network, mtoken);
  const feedAddr = requirePaymentTokenFeed(network, paymentToken, mtoken);

  const vaultsProgram = getVaultsProgram(provider);

  // Fetch vault state
  const commonState = await fetchVaultCommonState(vaultsProgram, vaultCommon);
  const commonUser = await fetchVaultCommonAccountState(
    vaultsProgram,
    getCommonVaultAccountStatePda(vaultCommon, payer.publicKey),
    true,
  );

  // Get balances
  const mTokenBalance = await getBalance(
    provider.connection,
    payer.publicKey,
    commonState.mMint,
    TOKEN_2022_PROGRAM_ID,
  );
  const paymentTokenBalance = await getBalance(
    provider.connection,
    payer.publicKey,
    feedAddr.token,
    feedAddr.tokenProgram,
  );

  // Get mToken mint info
  const { getMint } = await import('@solana/spl-token');
  const mTokenMint = await getMint(
    provider.connection,
    commonState.mMint,
    undefined,
    TOKEN_2022_PROGRAM_ID,
  );

  // Payment token decimals (USDC/USDT standard)
  const paymentTokenDecimals = 6;

  console.log(`💰 Balances:`);
  console.log(`   ${mtoken}: ${formatUnits(mTokenBalance, mTokenMint.decimals)}`);
  console.log(`   ${paymentToken}: ${formatUnits(paymentTokenBalance, paymentTokenDecimals)}`);

  console.log(`\n📈 Vault State:`);
  console.log(`   Total mToken Supply: ${formatUnits(mTokenMint.supply, mTokenMint.decimals)}`);
  console.log(
    `   Instant Daily Limit Used: ${formatUnits(fromBN(commonState.instantDailyLimitUsed), paymentTokenDecimals)} ${paymentToken}`,
  );
  console.log(`   Free From Min First Mint: ${commonUser?.freeFromMinFirstMint}`);
  console.log(`   Free From Min Amount: ${commonUser?.freeFromMinAmount}`);

  console.log(`\n🔗 View on Explorer:`);
  console.log(
    `   Your Wallet: https://explorer.solana.com/address/${payer.publicKey.toBase58()}?cluster=${network}`,
  );
  console.log(
    `   Vault Common: https://explorer.solana.com/address/${vaultCommon.toBase58()}?cluster=${network}`,
  );
  console.log(
    `   mToken Mint: https://explorer.solana.com/address/${commonState.mMint.toBase58()}?cluster=${network}`,
  );
}

const network = getNetwork();
executeNetworkScript(network, main);

// yarn tsx scripts/verify/verify-mint-state.ts --network devnet --mtoken mTBILL --payment-token USDC
