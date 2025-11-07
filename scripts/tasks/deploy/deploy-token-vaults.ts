import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';

import { executeNetworkScript } from '@/common/utils';

import { loadTokenConfig, convertPublicKeysInConfig } from '../../configs/loadTokenConfig';
import { deployMinterVaultFromConfig } from '../../deploy/orchestrators/deployMinterVault';
import { deployRedeemerVaultFromConfig } from '../../deploy/orchestrators/deployRedeemerVault';
import { registerAddress } from '../../utils/addressManager';
import { getMtoken, getNetwork } from '../../utils/argumentParser';
import { verifyDependencies, verifyVaultsOnChain } from '../../utils/dependencyChecker';

async function main(provider: AnchorProvider, payer: Keypair) {
  const mtoken = getMtoken();
  const network = getNetwork();

  console.log(`╔══════════════════════════════════════════════╗`);
  console.log(`║           Vaults Deployment Script             ║`);
  console.log(`╚══════════════════════════════════════════════╝`);
  console.log(`Token: ${mtoken}`);
  console.log(`Network: ${network}`);
  console.log(`RPC URL: ${provider.connection.rpcEndpoint}`);
  console.log(`Deployer: ${payer.publicKey.toString()}`);
  console.log('');

  verifyDependencies(network, mtoken, ['mToken', 'tokenAuthority', 'mTokenDataFeed']);

  const verification = await verifyVaultsOnChain(provider, network, mtoken);

  console.log('Loading configuration...');
  const config = loadTokenConfig(mtoken, network);
  console.log('✓ Configuration loaded and validated');

  const finalConfig = convertPublicKeysInConfig(config);

  let minterVaultResult;
  if (verification.minter.exists && verification.minter.address) {
    console.log('\n[1/2] Minter Vault...');
    const { getTokenAddresses } = await import('../../utils/addressManager');
    const tokenAddrs = getTokenAddresses(network, mtoken);
    if (tokenAddrs?.minter) {
      minterVaultResult = tokenAddrs.minter;
      console.log(`  ✓ Already deployed: ${minterVaultResult.commonVault.toString()}`);
    } else {
      throw new Error('Minter vault exists on-chain but not in addresses.ts');
    }
  } else {
    console.log('\n[1/2] Deploying Minter Vault...');
    minterVaultResult = await deployMinterVaultFromConfig(
      provider,
      payer,
      finalConfig,
      network,
      mtoken,
    );
    registerAddress(network, mtoken, 'minter', minterVaultResult);
    console.log(`  ✓ Deployed: ${minterVaultResult.commonVault.toString()}`);
  }

  let redeemerVaultResult;
  if (verification.redeemer.exists && verification.redeemer.address) {
    console.log('\n[2/2] Redeemer Vault...');
    const { getTokenAddresses } = await import('../../utils/addressManager');
    const tokenAddrs = getTokenAddresses(network, mtoken);
    if (tokenAddrs?.redeemer) {
      redeemerVaultResult = tokenAddrs.redeemer;
      console.log(`  ✓ Already deployed: ${redeemerVaultResult.commonVault.toString()}`);
    } else {
      throw new Error('Redeemer vault exists on-chain but not in addresses.ts');
    }
  } else {
    console.log('\n[2/2] Deploying Redeemer Vault...');
    redeemerVaultResult = await deployRedeemerVaultFromConfig(
      provider,
      payer,
      finalConfig,
      network,
      mtoken,
    );
    registerAddress(network, mtoken, 'redeemer', redeemerVaultResult);
    console.log(`  ✓ Deployed: ${redeemerVaultResult.commonVault.toString()}`);
  }

  const { saveAddressesToFile } = await import('../../utils/addressManager');
  await saveAddressesToFile();

  console.log('\n' + '='.repeat(50));
  console.log('✅ Vaults deployment completed!');
  console.log(`Minter Vault: ${minterVaultResult.commonVault.toString()}`);
  console.log(`Redeemer Vault: ${redeemerVaultResult.commonVault.toString()}`);
  console.log('='.repeat(50));
}

const network = getNetwork();
executeNetworkScript(network, main);
