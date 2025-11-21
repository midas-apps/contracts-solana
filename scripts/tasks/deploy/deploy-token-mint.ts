import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

import { createMTokenMint } from '@/common/create-mtoken-mint';
import { createUserError, isAccountNotFoundError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';

import { loadTokenConfig } from '../../configs/loadTokenConfig';
import { getTokenAddresses, getTokenAcRoleAddress } from '../../utils/addressQueries';
import { registerAddress } from '../../utils/addressRegistry';
import { saveAddressesToFile } from '../../utils/addressStorage';
import { getMtoken, getNetwork } from '../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Wallet, network: string) {
  const mtoken = getMtoken();

  console.log(`Deploying mToken mint for: ${mtoken}`);

  const config = loadTokenConfig(mtoken, network);
  const existingAddresses = getTokenAddresses(network, mtoken);

  // Check prerequisite: AC Role must exist
  const acRole = getTokenAcRoleAddress(network, mtoken);
  if (!acRole) {
    throw createUserError(`Token AC Role not found for ${mtoken} on ${network}`, [
      `Run: yarn deploy:token-ac-role --mtoken ${mtoken} --network ${network}`,
    ]);
  }

  let mToken: PublicKey;
  if (existingAddresses?.mToken) {
    try {
      const mintInfo = await provider.connection.getAccountInfo(existingAddresses.mToken);
      if (mintInfo) {
        mToken = existingAddresses.mToken;
        console.log(`✓ mToken already exists: ${mToken.toString()}`);
      } else {
        throw createUserError('mToken in addresses.ts does not exist on-chain', [
          'Remove the address from addresses.ts or verify the account exists',
        ]);
      }
    } catch (error) {
      if (isAccountNotFoundError(error)) {
        const mint = await createMTokenMint({
          provider,
          authority: payer.publicKey,
          metadata: {
            name: config.metadata.name,
            symbol: config.metadata.symbol,
            uri: config.metadata.uri || '',
            additionalMetadata: [],
          },
        });
        mToken = mint.publicKey;
      } else {
        throw error;
      }
    }
  } else {
    const mint = await createMTokenMint({
      provider,
      authority: payer.publicKey,
      metadata: {
        name: config.metadata.name,
        symbol: config.metadata.symbol,
        uri: config.metadata.uri || '',
        additionalMetadata: [],
      },
    });
    mToken = mint.publicKey;
  }

  registerAddress(network, mtoken, 'mToken', mToken);
  await saveAddressesToFile();

  console.log('✅ mToken mint deployed successfully');
  console.log(`mToken: ${mToken.toString()}`);
}

const network = getNetwork();
executeNetworkScript(network, main, 'deployer');
