import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair } from '@solana/web3.js';

import { executeNetworkScript } from '@/common/scriptRunner';

import { loadTokenConfig } from '../../configs/loadTokenConfig';
import { deployMinterVaultFromConfig } from '../../deploy/orchestrators/deployMinterVault';
import { deployRedeemerVaultFromConfig } from '../../deploy/orchestrators/deployRedeemerVault';
import { registerAddress } from '../../utils/addressRegistry';
import { getMtoken, getNetwork } from '../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Keypair) {
  const mtoken = getMtoken();
  const network = getNetwork();

  console.log(`Deploying vaults for: ${mtoken}`);

  const config = loadTokenConfig(mtoken, network);

  const minterVaultResult = await deployMinterVaultFromConfig(
    provider,
    payer,
    config,
    network,
    mtoken,
  );
  registerAddress(network, mtoken, 'minter', minterVaultResult);

  const redeemerVaultResult = await deployRedeemerVaultFromConfig(
    provider,
    payer,
    config,
    network,
    mtoken,
  );
  registerAddress(network, mtoken, 'redeemer', redeemerVaultResult);

  const { saveAddressesToFile } = await import('../../utils/addressStorage');
  await saveAddressesToFile();

  console.log(`✅ Vaults deployment completed`);
  console.log(`Minter Vault: ${minterVaultResult.commonVault.toString()}`);
  console.log(`Redeemer Vault: ${redeemerVaultResult.commonVault.toString()}`);
}

const network = getNetwork();
executeNetworkScript(network, main);
