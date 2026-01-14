import { AnchorProvider } from '@coral-xyz/anchor';
import {
  ExtensionType,
  getExtensionTypes,
  getMetadataPointerState,
  getMint,
  getPermanentDelegate,
  getTokenMetadata,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

import { addresses, TokenAddresses } from '@/common/addresses';
import { executeNetworkScript } from '@/common/scriptRunner';
import { MProduct } from '@/common/tokenTypes';
import { VAULTS_PROGRAM_ID } from '@/test/constants/vaults.constants';
import { formatUnits, fromBN } from '@/test/helpers/common.helpers';
import { fetchDataFeedState, getManualFeedStatePda } from '@/test/helpers/data-feed.helpers';
import { fetchTokenAuthorityState } from '@/test/helpers/token-authority.helpers';
import {
  fetchMinterVaultState,
  fetchRedeemerVaultState,
  fetchVaultCommonState,
  getMinterVaultPda,
  getPaymentMintStatePda,
  getRedeemerVaultPda,
} from '@/test/helpers/vaults.helpers';

import { getDataFeedProgram } from '../../deploy/dataFeed';
import { getTokenAuthorityProgram } from '../../deploy/token-authority';
import { getVaultsProgram } from '../../deploy/vaults';
import { getNetwork, getOptionalArg } from '../../utils/argumentParser';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

interface MProductMatch {
  mProduct: MProduct;
  addresses: TokenAddresses;
}

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

interface PaymentTokenState {
  mint: PublicKey;
  fee: string;
  allowance: string;
  stable: boolean;
  dataFeed: PublicKey;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════════

function getMintAddress(): PublicKey {
  const mint = getOptionalArg('mint') || getOptionalArg('address') || getOptionalArg('m');
  if (!mint) {
    throw new Error('Mint address is required. Use --mint or --address to specify.');
  }
  try {
    return new PublicKey(mint);
  } catch {
    throw new Error(`Invalid mint address: ${mint}`);
  }
}

function findMProductByMint(network: string, mintAddress: PublicKey): MProductMatch | null {
  const networkAddresses = addresses[network];
  if (!networkAddresses?.tokens) return null;

  for (const [mProduct, tokenAddrs] of Object.entries(networkAddresses.tokens)) {
    if (tokenAddrs?.mToken?.equals(mintAddress)) {
      return {
        mProduct: mProduct as MProduct,
        addresses: tokenAddrs,
      };
    }
  }
  return null;
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
  return `$${priceNumber.toFixed(6)} (raw: ${priceBN.toString()})`;
}

function explorerLink(address: PublicKey | string, network: string): string {
  const addr = typeof address === 'string' ? address : address.toBase58();
  const cluster = network === 'mainnet' ? '' : `?cluster=${network}`;
  return `https://explorer.solana.com/address/${addr}${cluster}`;
}

async function getAllPaymentTokensForVault(
  provider: AnchorProvider,
  vaultCommon: PublicKey,
): Promise<PaymentTokenState[]> {
  const vaultsProgram = getVaultsProgram(provider);
  const connection = provider.connection;

  // PaymentMintState size: discriminator (8) + mint (32) + data_feed (32) + fee (8) + allowance (16) + stable (1)
  const paymentMintStateSize = 8 + 32 + 32 + 8 + 16 + 1;

  const accounts = await connection.getProgramAccounts(VAULTS_PROGRAM_ID, {
    filters: [{ dataSize: paymentMintStateSize }],
  });

  const paymentTokens: PaymentTokenState[] = [];

  for (const accountInfo of accounts) {
    try {
      const account = await vaultsProgram.account.paymentMintState.fetch(accountInfo.pubkey);
      if (!account) continue;

      const expectedPda = getPaymentMintStatePda(vaultCommon, account.mint);
      if (accountInfo.pubkey.equals(expectedPda)) {
        paymentTokens.push({
          mint: account.mint,
          fee: account.fee.toString(),
          allowance: account.allowance.toString(),
          stable: account.stable,
          dataFeed: account.dataFeed,
        });
      }
    } catch {
      // Skip accounts that don't parse correctly
    }
  }

  return paymentTokens;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════════════════════

async function main(provider: AnchorProvider) {
  const network = getNetwork();
  const mintAddress = getMintAddress();

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`  MTOKEN STATE VERIFICATION`);
  console.log(`${'═'.repeat(80)}`);
  console.log(`  Network: ${network}`);
  console.log(`  Mint:    ${mintAddress.toBase58()}`);
  console.log(`${'═'.repeat(80)}\n`);

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. mToken Mint Info (SPL Token 2022)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n┌${'─'.repeat(78)}┐`);
  console.log(`│  1. MTOKEN MINT INFO (SPL Token 2022)${' '.repeat(40)}│`);
  console.log(`└${'─'.repeat(78)}┘\n`);

  try {
    const mint = await getMint(provider.connection, mintAddress, undefined, TOKEN_2022_PROGRAM_ID);

    console.log(`  ✓ Mint Address:     ${mintAddress.toBase58()}`);
    console.log(`  ✓ Supply:           ${formatUnits(mint.supply, mint.decimals)} tokens`);
    console.log(`  ✓ Decimals:         ${mint.decimals}`);
    console.log(`  ✓ Is Initialized:   ${mint.isInitialized}`);
    console.log(
      `  ✓ Mint Authority:   ${mint.mintAuthority?.toBase58() || 'None (frozen supply)'}`,
    );
    console.log(
      `  ✓ Freeze Authority: ${mint.freezeAuthority?.toBase58() || 'None (cannot freeze)'}`,
    );

    // Extensions
    const extensions = getExtensionTypes(mint.tlvData);
    console.log(
      `  ✓ Extensions:       ${extensions.map((e) => ExtensionType[e]).join(', ') || 'None'}`,
    );

    // Metadata Pointer
    const metadataPointer = getMetadataPointerState(mint);
    if (metadataPointer?.metadataAddress) {
      console.log(`  ✓ Metadata Pointer: ${metadataPointer.metadataAddress.toBase58()}`);

      try {
        const metadata = await getTokenMetadata(
          provider.connection,
          metadataPointer.metadataAddress,
        );
        if (metadata) {
          console.log(`\n  📋 Token Metadata:`);
          console.log(`     Name:   ${metadata.name}`);
          console.log(`     Symbol: ${metadata.symbol}`);
          console.log(`     URI:    ${metadata.uri || '(empty)'}`);
          if (metadata.additionalMetadata?.length > 0) {
            console.log(`     Additional: ${JSON.stringify(metadata.additionalMetadata)}`);
          }
        }
      } catch {
        console.log(`  ⚠️  Could not fetch token metadata`);
      }
    }

    // Permanent Delegate
    const permanentDelegate = getPermanentDelegate(mint);
    if (permanentDelegate?.delegate) {
      console.log(`  ✓ Permanent Delegate: ${permanentDelegate.delegate.toBase58()}`);
    }
  } catch (error) {
    console.log(
      `  ❌ Failed to fetch mint info: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
    console.log(`     This may not be a valid Token-2022 mint.`);
    return;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. Address Registry Lookup
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n┌${'─'.repeat(78)}┐`);
  console.log(`│  2. ADDRESS REGISTRY LOOKUP${' '.repeat(50)}│`);
  console.log(`└${'─'.repeat(78)}┘\n`);

  const match = findMProductByMint(network, mintAddress);

  if (!match) {
    console.log(`  ⚠️  This mint is NOT registered in addresses.ts for ${network}`);
    console.log(`     Cannot determine associated vaults, feeds, or token authority.`);
    console.log(`\n  🔗 Explorer: ${explorerLink(mintAddress, network)}`);
    return;
  }

  const { mProduct, addresses: tokenAddrs } = match;

  console.log(`  ✓ mProduct:         ${mProduct}`);
  console.log(`  ✓ AC Role:          ${tokenAddrs.acRole?.toBase58() || 'Not set'}`);

  if (tokenAddrs.tokenAuthority) {
    console.log(`  ✓ Token Authority:`);
    console.log(`     Account: ${tokenAddrs.tokenAuthority.account.toBase58()}`);
    console.log(`     Seed:    ${tokenAddrs.tokenAuthority.seed}`);
  } else {
    console.log(`  ⚠️  Token Authority: Not configured`);
  }

  if (tokenAddrs.mTokenDataFeed) {
    console.log(`  ✓ mToken Data Feed: ${tokenAddrs.mTokenDataFeed.toBase58()}`);
  }

  if (tokenAddrs.minter) {
    console.log(`  ✓ Minter Vault:`);
    console.log(`     Common:  ${tokenAddrs.minter.commonVault.toBase58()}`);
    console.log(`     Account: ${tokenAddrs.minter.account.toBase58()}`);
  } else {
    console.log(`  ⚠️  Minter Vault: Not configured`);
  }

  if (tokenAddrs.redeemer) {
    console.log(`  ✓ Redeemer Vault:`);
    console.log(`     Common:  ${tokenAddrs.redeemer.commonVault.toBase58()}`);
    console.log(`     Account: ${tokenAddrs.redeemer.account.toBase58()}`);
  } else {
    console.log(`  ⚠️  Redeemer Vault: Not configured`);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. Token Authority State
  // ─────────────────────────────────────────────────────────────────────────────
  if (tokenAddrs.tokenAuthority) {
    console.log(`\n┌${'─'.repeat(78)}┐`);
    console.log(`│  3. TOKEN AUTHORITY STATE${' '.repeat(52)}│`);
    console.log(`└${'─'.repeat(78)}┘\n`);

    try {
      const taProgram = getTokenAuthorityProgram(provider);
      const taState = await fetchTokenAuthorityState(
        taProgram,
        tokenAddrs.tokenAuthority.account,
        true,
      );

      if (taState) {
        console.log(`  ✓ Token Authority:  ${tokenAddrs.tokenAuthority.account.toBase58()}`);
        console.log(`  ✓ AC Role:          ${taState.acRole.toBase58()}`);
      } else {
        console.log(`  ⚠️  Token Authority account exists in config but not on-chain`);
      }
    } catch (error) {
      console.log(
        `  ❌ Failed to fetch token authority: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. mToken Data Feed State
  // ─────────────────────────────────────────────────────────────────────────────
  if (tokenAddrs.mTokenDataFeed) {
    console.log(`\n┌${'─'.repeat(78)}┐`);
    console.log(`│  4. MTOKEN DATA FEED STATE${' '.repeat(51)}│`);
    console.log(`└${'─'.repeat(78)}┘\n`);

    try {
      const dfProgram = getDataFeedProgram(provider);
      const feedState = (await fetchDataFeedState(
        dfProgram,
        tokenAddrs.mTokenDataFeed,
      )) as FeedState | null;

      if (feedState) {
        const mode = formatMode(feedState.mode);

        console.log(`  ✓ Feed Address:     ${tokenAddrs.mTokenDataFeed.toBase58()}`);
        console.log(`  ✓ Mode:             ${mode}`);
        console.log(`  ✓ AC Role:          ${feedState.acRole.toBase58()}`);
        console.log(`  ✓ Underlying Feed:  ${feedState.underlyingFeed.toBase58()}`);
        console.log(`  ✓ Min Price:        ${formatPrice(feedState.minPrice)}`);
        console.log(`  ✓ Max Price:        ${formatPrice(feedState.maxPrice)}`);
        console.log(`  ✓ Max Staleness:    ${feedState.maxStaleness}s`);

        // Try to fetch current price for manual feeds
        if (mode === 'manual') {
          try {
            const manualFeedPda = getManualFeedStatePda(tokenAddrs.mTokenDataFeed);
            const manualState =
              await dfProgram.account.manualFeedState.fetchNullable(manualFeedPda);
            if (manualState) {
              const price = BigInt(manualState.price.toString());
              const priceNumber = Number(price) / 10 ** manualState.decimals;
              console.log(`\n  📈 Current Price:`);
              console.log(`     Value:    $${priceNumber.toFixed(6)}`);
              console.log(`     Decimals: ${manualState.decimals}`);
              if (manualState.lastUpdatedAt) {
                const date = new Date(manualState.lastUpdatedAt * 1000);
                console.log(`     Updated:  ${date.toISOString()}`);
              }
            }
          } catch {
            console.log(`  ⚠️  Could not fetch manual feed price`);
          }
        }
      } else {
        console.log(`  ⚠️  Data feed exists in config but not on-chain`);
      }
    } catch (error) {
      console.log(
        `  ❌ Failed to fetch data feed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. Vault States
  // ─────────────────────────────────────────────────────────────────────────────
  const vaultsProgram = getVaultsProgram(provider);

  // Minter Vault
  if (tokenAddrs.minter) {
    console.log(`\n┌${'─'.repeat(78)}┐`);
    console.log(`│  5a. MINTER VAULT STATE${' '.repeat(54)}│`);
    console.log(`└${'─'.repeat(78)}┘\n`);

    try {
      const commonState = await fetchVaultCommonState(
        vaultsProgram,
        tokenAddrs.minter.commonVault,
        true,
      );

      if (commonState) {
        console.log(`  📦 Common Vault State:`);
        console.log(`     mMint:              ${commonState.mMint.toBase58()}`);
        console.log(`     AC Role:            ${commonState.acRole.toBase58()}`);
        console.log(`     AC:                 ${commonState.ac.toBase58()}`);
        console.log(`     mToken Feed:        ${commonState.mMintFeed.toBase58()}`);
        console.log(`     Tokens Receiver:    ${commonState.tokensReceiver.toBase58()}`);
        console.log(`     Fee Receiver:       ${commonState.feeReceiver.toBase58()}`);
        console.log(`     Green List Enforced: ${commonState.greenlistEnforced}`);
        console.log(`     Instant Fee:        ${formatUnits(fromBN(commonState.instantFee), 2)}%`);
        console.log(
          `     Instant Daily Limit: ${formatUnits(fromBN(commonState.instantDailyLimit), 9)} (used: ${formatUnits(fromBN(commonState.instantDailyLimitUsed), 9)})`,
        );
        console.log(
          `     Variation Tolerance: ${formatUnits(fromBN(commonState.variationTolerance), 2)}%`,
        );
        console.log(`     Min Amount:         ${formatUnits(fromBN(commonState.minAmount), 9)}`);
        console.log(`     Requests Count:     ${fromBN(commonState.requestsCount)}`);

        // Minter-specific state
        const minterVaultPda = getMinterVaultPda(tokenAddrs.minter.commonVault);
        const minterState = await fetchMinterVaultState(vaultsProgram, minterVaultPda, true);

        if (minterState) {
          console.log(`\n  🏭 Minter Vault State:`);
          console.log(`     Mint Authority PDA:   ${minterState.mintAuthorityPda.toBase58()}`);
          console.log(
            `     First Deposit Min:    ${formatUnits(fromBN(minterState.firstDepositMinMTokens), 9)}`,
          );
        }

        // Payment tokens
        console.log(`\n  💳 Payment Tokens:`);
        const paymentTokens = await getAllPaymentTokensForVault(
          provider,
          tokenAddrs.minter.commonVault,
        );

        if (paymentTokens.length === 0) {
          console.log(`     ⚠️  No payment tokens configured`);
        } else {
          for (const pt of paymentTokens) {
            const isFiat = pt.mint.toBase58() === '11111111111111111111111111111111';
            console.log(`\n     Mint: ${pt.mint.toBase58()} ${isFiat ? '(FIAT)' : ''}`);
            console.log(`       Fee:       ${pt.fee}`);
            console.log(`       Allowance: ${pt.allowance}`);
            console.log(`       Stable:    ${pt.stable}`);
            if (!isFiat) {
              console.log(`       Data Feed: ${pt.dataFeed.toBase58()}`);
            }
          }
        }
      } else {
        console.log(`  ⚠️  Minter vault exists in config but not on-chain`);
      }
    } catch (error) {
      console.log(
        `  ❌ Failed to fetch minter vault: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // Redeemer Vault
  if (tokenAddrs.redeemer) {
    console.log(`\n┌${'─'.repeat(78)}┐`);
    console.log(`│  5b. REDEEMER VAULT STATE${' '.repeat(52)}│`);
    console.log(`└${'─'.repeat(78)}┘\n`);

    try {
      const commonState = await fetchVaultCommonState(
        vaultsProgram,
        tokenAddrs.redeemer.commonVault,
        true,
      );

      if (commonState) {
        console.log(`  📦 Common Vault State:`);
        console.log(`     mMint:              ${commonState.mMint.toBase58()}`);
        console.log(`     AC Role:            ${commonState.acRole.toBase58()}`);
        console.log(`     AC:                 ${commonState.ac.toBase58()}`);
        console.log(`     mToken Feed:        ${commonState.mMintFeed.toBase58()}`);
        console.log(`     Tokens Receiver:    ${commonState.tokensReceiver.toBase58()}`);
        console.log(`     Fee Receiver:       ${commonState.feeReceiver.toBase58()}`);
        console.log(`     Green List Enforced: ${commonState.greenlistEnforced}`);
        console.log(`     Instant Fee:        ${formatUnits(fromBN(commonState.instantFee), 2)}%`);
        console.log(
          `     Instant Daily Limit: ${formatUnits(fromBN(commonState.instantDailyLimit), 9)} (used: ${formatUnits(fromBN(commonState.instantDailyLimitUsed), 9)})`,
        );
        console.log(
          `     Variation Tolerance: ${formatUnits(fromBN(commonState.variationTolerance), 2)}%`,
        );
        console.log(`     Min Amount:         ${formatUnits(fromBN(commonState.minAmount), 9)}`);
        console.log(`     Requests Count:     ${fromBN(commonState.requestsCount)}`);

        // Redeemer-specific state
        const redeemerVaultPda = getRedeemerVaultPda(tokenAddrs.redeemer.commonVault);
        const redeemerState = await fetchRedeemerVaultState(vaultsProgram, redeemerVaultPda, true);

        if (redeemerState) {
          console.log(`\n  🔄 Redeemer Vault State:`);
          console.log(`     Request Redeemer:    ${redeemerState.requestRedeemer.toBase58()}`);
          console.log(
            `     Min Fiat Redeem:     ${formatUnits(fromBN(redeemerState.minFiatRedeemAmount), 9)}`,
          );
          console.log(
            `     Fiat Flat Fee:       ${formatUnits(fromBN(redeemerState.fiatFlatFee), 9)}`,
          );
        }

        // Payment tokens
        console.log(`\n  💳 Payment Tokens:`);
        const paymentTokens = await getAllPaymentTokensForVault(
          provider,
          tokenAddrs.redeemer.commonVault,
        );

        if (paymentTokens.length === 0) {
          console.log(`     ⚠️  No payment tokens configured`);
        } else {
          for (const pt of paymentTokens) {
            const isFiat = pt.mint.toBase58() === '11111111111111111111111111111111';
            console.log(`\n     Mint: ${pt.mint.toBase58()} ${isFiat ? '(FIAT)' : ''}`);
            console.log(`       Fee:       ${pt.fee}`);
            console.log(`       Allowance: ${pt.allowance}`);
            console.log(`       Stable:    ${pt.stable}`);
            if (!isFiat) {
              console.log(`       Data Feed: ${pt.dataFeed.toBase58()}`);
            }
          }
        }
      } else {
        console.log(`  ⚠️  Redeemer vault exists in config but not on-chain`);
      }
    } catch (error) {
      console.log(
        `  ❌ Failed to fetch redeemer vault: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 6. Explorer Links
  // ─────────────────────────────────────────────────────────────────────────────
  console.log(`\n┌${'─'.repeat(78)}┐`);
  console.log(`│  6. EXPLORER LINKS${' '.repeat(59)}│`);
  console.log(`└${'─'.repeat(78)}┘\n`);

  console.log(`  🔗 mToken Mint:`);
  console.log(`     ${explorerLink(mintAddress, network)}`);

  if (tokenAddrs.acRole) {
    console.log(`\n  🔗 AC Role:`);
    console.log(`     ${explorerLink(tokenAddrs.acRole, network)}`);
  }

  if (tokenAddrs.tokenAuthority) {
    console.log(`\n  🔗 Token Authority:`);
    console.log(`     ${explorerLink(tokenAddrs.tokenAuthority.account, network)}`);
  }

  if (tokenAddrs.mTokenDataFeed) {
    console.log(`\n  🔗 mToken Data Feed:`);
    console.log(`     ${explorerLink(tokenAddrs.mTokenDataFeed, network)}`);
  }

  if (tokenAddrs.minter) {
    console.log(`\n  🔗 Minter Vault (Common):`);
    console.log(`     ${explorerLink(tokenAddrs.minter.commonVault, network)}`);
  }

  if (tokenAddrs.redeemer) {
    console.log(`\n  🔗 Redeemer Vault (Common):`);
    console.log(`     ${explorerLink(tokenAddrs.redeemer.commonVault, network)}`);
  }

  console.log(`\n${'═'.repeat(80)}`);
  console.log(`  ✅ Verification complete`);
  console.log(`${'═'.repeat(80)}\n`);
}

const network = getNetwork();
executeNetworkScript(network, main);

// Usage:
// yarn tsx scripts/tasks/verify/verify-mtoken-state.ts --network mainnet --mint ESS9fuAbDiyDXy6y1ZAt9VSaiGPSqG8NwaWVX7dePdR7
// yarn tsx scripts/tasks/verify/verify-mtoken-state.ts --network devnet --address Ds5juQNpMUwZamY8fbynBrCyBNR8dGnSy2yeFAD3YKRq
