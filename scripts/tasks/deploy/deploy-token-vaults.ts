import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';

import { executeNetworkScript } from '@/common/utils';

import { loadTokenConfig, convertPublicKeysInConfig } from '../../configs/loadTokenConfig';
import { deployMinterVaultFromConfig } from '../../deploy/orchestrators/deployMinterVault';
import { deployRedeemerVaultFromConfig } from '../../deploy/orchestrators/deployRedeemerVault';
import { registerAddress } from '../../utils/addressManager';
import { parseTokenDeploymentArgs } from '../../utils/argumentParser';
import { verifyDependencies } from '../../utils/dependencyChecker';

async function main(provider: AnchorProvider, payer: Keypair) {
  const args = parseTokenDeploymentArgs();

  console.log(`╔══════════════════════════════════════════════╗`);
  console.log(`║           Vaults Deployment Script             ║`);
  console.log(`╚══════════════════════════════════════════════╝`);
  console.log(`Token: ${args.mtoken}`);
  console.log(`Network: ${args.network}`);
  console.log(`RPC URL: ${provider.connection.rpcEndpoint}`);
  console.log(`Deployer: ${payer.publicKey.toString()}`);
  console.log('');

  // Verify dependencies: network infrastructure + required token components
  verifyDependencies(args.network, args.mtoken, ['mToken', 'tokenAuthority', 'mTokenDataFeed']);

  // Load configuration
  console.log('Loading configuration...');
  const config = loadTokenConfig(args.mtoken, args.network);
  console.log('✓ Configuration loaded and validated');

  // Convert string PublicKeys to PublicKey objects
  const finalConfig = convertPublicKeysInConfig(config);

  // Deploy minter vault
  console.log('\n[1/2] Deploying Minter Vault...');
  const minterVaultResult = await deployMinterVaultFromConfig(
    provider,
    payer,
    finalConfig,
    args.network,
    args.mtoken,
  );
  registerAddress(args.network, args.mtoken, 'minter', minterVaultResult);
  console.log(`✓ Minter Vault deployed: ${minterVaultResult.commonVault.toString()}`);

  // Deploy redeemer vault
  console.log('\n[2/2] Deploying Redeemer Vault...');
  const redeemerVaultResult = await deployRedeemerVaultFromConfig(
    provider,
    payer,
    finalConfig,
    args.network,
    args.mtoken,
  );
  registerAddress(args.network, args.mtoken, 'redeemer', redeemerVaultResult);
  console.log(`✓ Redeemer Vault deployed: ${redeemerVaultResult.commonVault.toString()}`);

  console.log('\n' + '='.repeat(50));
  console.log('✅ Vaults deployed successfully!');
  console.log(`Minter Vault: ${minterVaultResult.commonVault.toString()}`);
  console.log(`Redeemer Vault: ${redeemerVaultResult.commonVault.toString()}`);
  console.log('='.repeat(50));
}

const args = parseTokenDeploymentArgs();
executeNetworkScript(args.network, main);
