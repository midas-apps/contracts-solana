import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';

import { createMTokenMint } from '@/common/create-mtoken-mint';
import {
  createUserError,
  isAccountNotFoundError,
  isUserActionableError,
} from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';

import { loadTokenConfig } from '../../configs/loadTokenConfig';
import { deployAcRole, getAcProgram } from '../../deploy/ac';
import { getTokenAuthorityProgram, deployTokenAuthority } from '../../deploy/token-authority';
import { getTokenAddresses } from '../../utils/addressQueries';
import { registerAddress } from '../../utils/addressRegistry';
import { saveAddressesToFile } from '../../utils/addressStorage';
import { getMtoken, getNetwork } from '../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Keypair) {
  const mtoken = getMtoken();
  const network = getNetwork();

  console.log(`Deploying core token: ${mtoken}`);

  const config = loadTokenConfig(mtoken, network);
  const existingAddresses = getTokenAddresses(network, mtoken);
  const acProgram = getAcProgram(provider);
  const tokenAuthorityProgram = getTokenAuthorityProgram(provider);

  let acRole: PublicKey;
  if (existingAddresses?.acRole) {
    try {
      await acProgram.account.accessControlRoleState.fetch(existingAddresses.acRole);
      acRole = existingAddresses.acRole;
    } catch (error) {
      if (isAccountNotFoundError(error)) {
        acRole = await deployAcRole({ provider, payer }, {});
      } else {
        throw createUserError('AC Role in addresses.ts does not exist on-chain', [
          'Remove the address from addresses.ts or verify the account exists',
        ]);
      }
    }
  } else {
    acRole = await deployAcRole({ provider, payer }, {});
  }
  registerAddress(network, mtoken, 'acRole', acRole);
  await saveAddressesToFile();

  let mToken: PublicKey;
  if (existingAddresses?.mToken) {
    try {
      const mintInfo = await provider.connection.getAccountInfo(existingAddresses.mToken);
      if (mintInfo) {
        mToken = existingAddresses.mToken;
      } else {
        throw createUserError('mToken in addresses.ts does not exist on-chain', [
          'Remove the address from addresses.ts or verify the account exists',
        ]);
      }
    } catch (error) {
      if (isAccountNotFoundError(error)) {
        const mint = await createMTokenMint({
          payer,
          authority: payer.publicKey,
          connection: provider.connection,
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
      payer,
      authority: payer.publicKey,
      connection: provider.connection,
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

  // Use the acRole we just deployed/verified above - no need to resolve it again
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

  console.log('✅ Core token deployed successfully');
  console.log(`AC Role: ${acRole.toString()}`);
  console.log(`mToken: ${mToken.toString()}`);
  console.log(`Token Authority: ${tokenAuthority.toString()}`);
}

const network = getNetwork();
executeNetworkScript(network, main);
