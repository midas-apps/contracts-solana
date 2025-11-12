import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';

import {
  createUserError,
  isAccountNotFoundError,
  isUserActionableError,
} from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';

import { loadTokenConfig } from '../../configs/loadTokenConfig';
import { getTokenAuthorityProgram, deployTokenAuthority } from '../../deploy/token-authority';
import { getTokenAddresses, getTokenAcRoleAddress } from '../../utils/addressQueries';
import { registerAddress } from '../../utils/addressRegistry';
import { saveAddressesToFile } from '../../utils/addressStorage';
import { getMtoken, getNetwork } from '../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Keypair) {
  const mtoken = getMtoken();
  const network = getNetwork();

  console.log(`Deploying token authority for: ${mtoken}`);

  const config = loadTokenConfig(mtoken, network);
  const existingAddresses = getTokenAddresses(network, mtoken);
  const tokenAuthorityProgram = getTokenAuthorityProgram(provider);

  // Check prerequisites: AC Role and mToken must exist
  const acRole = getTokenAcRoleAddress(network, mtoken);
  if (!acRole) {
    throw createUserError(`Token AC Role not found for ${mtoken} on ${network}`, [
      `Run: yarn deploy:token-ac-role --mtoken ${mtoken} --network ${network}`,
    ]);
  }

  const tokenAddrs = getTokenAddresses(network, mtoken);
  if (!tokenAddrs?.mToken) {
    throw createUserError(`mToken not found for ${mtoken} on ${network}`, [
      `Run: yarn deploy:token-mint --mtoken ${mtoken} --network ${network}`,
    ]);
  }

  let tokenAuthority: PublicKey;
  if (existingAddresses?.tokenAuthority) {
    try {
      const existingTokenAuthorityState =
        await tokenAuthorityProgram.account.tokenAuthorityState.fetch(
          existingAddresses.tokenAuthority.account,
        );
      // Verify the AC Role matches what we're deploying
      if (!existingTokenAuthorityState.acRole.equals(acRole)) {
        throw createUserError(
          `Token Authority AC Role mismatch: found ${existingTokenAuthorityState.acRole.toString()}, expected ${acRole.toString()}`,
          [
            'The token authority exists with a different AC Role',
            'Remove the token authority from addresses.ts to redeploy with the correct AC Role',
            'Or verify the AC Role in addresses.ts matches the on-chain AC Role',
          ],
        );
      }
      tokenAuthority = existingAddresses.tokenAuthority.account;
      console.log(`✓ Token Authority already exists: ${tokenAuthority.toString()}`);
    } catch (error) {
      // Re-throw user errors (like AC Role mismatch) as-is
      if (isUserActionableError(error)) {
        throw error;
      }
      if (isAccountNotFoundError(error)) {
        const authority = await deployTokenAuthority(
          { provider, payer },
          {
            acRole: acRole,
            seed: config.tokenAuthority.seed,
          },
        );
        tokenAuthority = authority;
      } else {
        throw createUserError('Token Authority in addresses.ts does not exist on-chain', [
          'Remove the address from addresses.ts or verify the account exists',
        ]);
      }
    }
  } else {
    const authority = await deployTokenAuthority(
      { provider, payer },
      {
        acRole: acRole,
        seed: config.tokenAuthority.seed,
      },
    );
    tokenAuthority = authority;
  }

  registerAddress(network, mtoken, 'tokenAuthority', {
    seed: config.tokenAuthority.seed,
    account: tokenAuthority,
  });
  await saveAddressesToFile();

  console.log('✅ Token Authority deployed successfully');
  console.log(`Token Authority: ${tokenAuthority.toString()}`);
}

const network = getNetwork();
executeNetworkScript(network, main);
