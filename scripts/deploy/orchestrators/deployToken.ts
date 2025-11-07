import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';

import { MProduct } from '@/common/tokenTypes';

import { TokenConfig } from '../../configs/types';
import { registerAddress } from '../../utils/addressManager';

import { deployDataFeedFromConfig } from './deployDataFeed';
import { deployMinterVaultFromConfig } from './deployMinterVault';
import { deployRedeemerVaultFromConfig } from './deployRedeemerVault';
import { deployTokenCore } from './deployTokenCore';

export interface TokenFullResult {
  acRole: PublicKey;
  mToken: PublicKey;
  tokenAuthority: PublicKey;
  dataFeed: PublicKey;
  minterVault: PublicKey;
  redeemerVault: PublicKey;
}

/**
 * Deploy full token: core components + data feed + vaults
 * For core components only, use deployTokenCore()
 */
export async function deployTokenFull(
  provider: AnchorProvider,
  payer: Keypair,
  tokenConfig: TokenConfig,
  network: string,
  tokenSymbol: MProduct,
): Promise<TokenFullResult> {
  // Deploy core token components first
  const coreResult = await deployTokenCore(provider, payer, tokenConfig, network, tokenSymbol);

  // Deploy Data Feed
  console.log('  [4/6] Deploying Data Feed...');
  const dataFeed = await deployDataFeedFromConfig(
    provider,
    payer,
    tokenConfig,
    network,
    tokenSymbol,
  );
  registerAddress(network, tokenSymbol, 'mTokenDataFeed', dataFeed);
  console.log(`    Data Feed: ${dataFeed.toString()}`);

  // Deploy Minter Vault
  console.log('  [5/6] Deploying Minter Vault...');
  const minterVaultResult = await deployMinterVaultFromConfig(
    provider,
    payer,
    tokenConfig,
    network,
    tokenSymbol,
  );
  registerAddress(network, tokenSymbol, 'minter', minterVaultResult);
  console.log(`    Minter Vault: ${minterVaultResult.commonVault.toString()}`);

  // Deploy Redeemer Vault
  console.log('  [6/6] Deploying Redeemer Vault...');
  const redeemerVaultResult = await deployRedeemerVaultFromConfig(
    provider,
    payer,
    tokenConfig,
    network,
    tokenSymbol,
  );
  registerAddress(network, tokenSymbol, 'redeemer', redeemerVaultResult);
  console.log(`    Redeemer Vault: ${redeemerVaultResult.commonVault.toString()}`);

  return {
    acRole: coreResult.acRole,
    mToken: coreResult.mToken,
    tokenAuthority: coreResult.tokenAuthority,
    dataFeed,
    minterVault: minterVaultResult.commonVault,
    redeemerVault: redeemerVaultResult.commonVault,
  };
}

// Export deployToken as alias for backward compatibility
export const deployToken = deployTokenFull;
