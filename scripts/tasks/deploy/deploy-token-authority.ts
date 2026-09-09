import { randomBytes } from 'crypto';

import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

import { createUserError, isAccountNotFoundError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';
import { fetchAccountNullable } from '@/test/helpers/common.helpers';

import { getTokenAuthorityProgram, deployTokenAuthority } from '../../deploy/token-authority';
import { getTokenAddresses, getTokenAcRoleAddress } from '../../utils/addressQueries';
import { registerAddress } from '../../utils/addressRegistry';
import { saveAddressesToFile } from '../../utils/addressStorage';
import { getMtoken, getNetwork } from '../../utils/argumentParser';

const generateSeed = () => {
  return randomBytes(32).toString('hex');
};

async function main(provider: AnchorProvider, payer: Wallet, network: string) {
  const mtoken = getMtoken();

  console.log(`Deploying token authority for: ${mtoken}`);

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

  const tokenAuthoritySeed = existingAddresses?.tokenAuthority?.seed ?? generateSeed();

  const fetchTokenAuthorityState = async (account: PublicKey, allowNull = false) => {
    return fetchAccountNullable(
      account,
      tokenAuthorityProgram.account.tokenAuthorityState,
      allowNull,
      isAccountNotFoundError,
    );
  };

  if (existingAddresses?.tokenAuthority) {
    const existingTokenAuthorityState = await fetchTokenAuthorityState(
      existingAddresses.tokenAuthority.account,
      true,
    );

    if (!existingTokenAuthorityState) {
      const authority = await deployTokenAuthority(
        { provider, payer, network },
        {
          acRole: acRole,
          seed: tokenAuthoritySeed,
        },
      );
      tokenAuthority = authority;
      console.log(`✓ Deployed new Token Authority: ${tokenAuthority.toString()}`);
    } else {
      tokenAuthority = existingAddresses.tokenAuthority.account;
      console.log(`✓ Token Authority already exists: ${tokenAuthority.toString()}`);
    }
  } else {
    const authority = await deployTokenAuthority(
      { provider, payer, network },
      {
        acRole: acRole,
        seed: tokenAuthoritySeed,
      },
    );
    tokenAuthority = authority;
    console.log(`✓ Deployed new Token Authority: ${tokenAuthority.toString()}`);
  }

  const existingTokenAuthorityState = (await fetchTokenAuthorityState(tokenAuthority, false))!;

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

  registerAddress(network, mtoken, 'tokenAuthority', {
    seed: tokenAuthoritySeed,
    account: tokenAuthority,
  });
  await saveAddressesToFile();

  console.log('✅ Token Authority deployed successfully');
  console.log(`Token Authority: ${tokenAuthority.toString()}`);
}

const network = getNetwork();
executeNetworkScript(network, main, 'deployer');
