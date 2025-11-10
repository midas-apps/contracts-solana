import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';

import { createMTokenMint } from '@/common/create-mtoken-mint';
import { createUserError, isAccountNotFoundError } from '@/common/errorHandler';
import { MProduct } from '@/common/tokenTypes';
import { getTokenAuthorityPda } from '@/test/helpers/token-authority.helpers';

import { TokenConfig } from '../../configs/types';
import { getTokenAddresses } from '../../utils/addressQueries';
import { registerAddress } from '../../utils/addressRegistry';
import { deployAcRole, DeployAcRoleConfig, getAcProgram } from '../contracts/ac';
import { getTokenAuthorityProgram } from '../contracts/token-authority';

import { deployTokenAuthorityFromConfig } from './deployTokenAuthority';

export interface TokenCoreResult {
  acRole: PublicKey;
  mToken: PublicKey;
  tokenAuthority: PublicKey;
}

/**
 * Deploy core token components: AC Role, mToken, and Token Authority
 * These are the foundational components needed before deploying data feed and vaults
 */
export async function deployTokenCore(
  provider: AnchorProvider,
  payer: Keypair,
  tokenConfig: TokenConfig,
  network: string,
  tokenSymbol: MProduct,
): Promise<TokenCoreResult> {
  const existingAddresses = getTokenAddresses(network, tokenSymbol);
  let acRole: PublicKey;
  let mToken: PublicKey;
  let tokenAuthority: PublicKey;

  console.log('  [1/3] Deploying AC Role...');
  if (existingAddresses?.acRole) {
    const acProgram = getAcProgram(provider);
    try {
      const onChainAcRole = await acProgram.account.accessControlRoleState.fetch(
        existingAddresses.acRole,
      );
      if (onChainAcRole) {
        acRole = existingAddresses.acRole;
        console.log(`    ✓ AC Role already deployed: ${acRole.toString()}`);
      } else {
        throw createUserError('AC Role in addresses.ts does not exist on-chain', [
          'Remove the address from addresses.ts or verify the account exists',
        ]);
      }
    } catch (error) {
      if (isAccountNotFoundError(error)) {
        console.warn(
          `⚠️  AC Role in addresses.ts (${existingAddresses.acRole.toString()}) does not exist on-chain. Deploying new one...`,
        );
        const acRoleConfig: DeployAcRoleConfig = {};
        acRole = await deployAcRole({ provider, payer }, acRoleConfig);
        registerAddress(network, tokenSymbol, 'acRole', acRole);
        console.log(`    AC Role: ${acRole.toString()}`);
      } else {
        throw error;
      }
    }
  } else {
    const acRoleConfig: DeployAcRoleConfig = {};
    acRole = await deployAcRole({ provider, payer }, acRoleConfig);
    registerAddress(network, tokenSymbol, 'acRole', acRole);
    console.log(`    AC Role: ${acRole.toString()}`);
  }

  console.log('  [2/3] Deploying mToken...');
  if (existingAddresses?.mToken) {
    try {
      const mintInfo = await provider.connection.getAccountInfo(existingAddresses.mToken);
      if (mintInfo) {
        mToken = existingAddresses.mToken;
        console.log(`    ✓ mToken already deployed: ${mToken.toString()}`);
      } else {
        throw createUserError('mToken in addresses.ts does not exist on-chain', [
          'Remove the address from addresses.ts or verify the account exists',
        ]);
      }
    } catch (error) {
      if (isAccountNotFoundError(error)) {
        console.warn(
          `⚠️  mToken in addresses.ts (${existingAddresses.mToken.toString()}) does not exist on-chain. Deploying new one...`,
        );
        const mint = await createMTokenMint({
          payer,
          authority: payer.publicKey,
          connection: provider.connection,
          metadata: {
            name: tokenConfig.metadata.name,
            symbol: tokenConfig.metadata.symbol,
            uri: tokenConfig.metadata.uri || '',
            additionalMetadata: [],
          },
        });
        mToken = mint.publicKey;
        registerAddress(network, tokenSymbol, 'mToken', mToken);
        console.log(`    mToken: ${mToken.toString()}`);
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
        name: tokenConfig.metadata.name,
        symbol: tokenConfig.metadata.symbol,
        uri: tokenConfig.metadata.uri || '',
        additionalMetadata: [],
      },
    });
    mToken = mint.publicKey;
    registerAddress(network, tokenSymbol, 'mToken', mToken);
    console.log(`    mToken: ${mToken.toString()}`);
  }

  console.log('  [3/3] Deploying Token Authority...');
  if (existingAddresses?.tokenAuthority) {
    const tokenAuthorityProgram = getTokenAuthorityProgram(provider);
    const expectedAuthority = getTokenAuthorityPda(tokenConfig.tokenAuthority.seed);

    if (!existingAddresses.tokenAuthority.account.equals(expectedAuthority)) {
      console.warn(
        `⚠️  Token authority address mismatch. Expected: ${expectedAuthority.toString()}, Found: ${existingAddresses.tokenAuthority.account.toString()}`,
      );
    }

    try {
      const onChainAuthority = await tokenAuthorityProgram.account.tokenAuthorityState.fetch(
        existingAddresses.tokenAuthority.account,
      );
      if (onChainAuthority) {
        tokenAuthority = existingAddresses.tokenAuthority.account;
        console.log(`    ✓ Token Authority already deployed: ${tokenAuthority.toString()}`);
      } else {
        throw createUserError('Token Authority in addresses.ts does not exist on-chain', [
          'Remove the address from addresses.ts or verify the account exists',
        ]);
      }
    } catch (error) {
      if (isAccountNotFoundError(error)) {
        console.warn(
          `⚠️  Token Authority in addresses.ts (${existingAddresses.tokenAuthority.account.toString()}) does not exist on-chain. Deploying new one...`,
        );
        const tokenAuthorityResult = await deployTokenAuthorityFromConfig(
          provider,
          payer,
          tokenConfig,
          network,
          tokenSymbol,
        );
        registerAddress(network, tokenSymbol, 'tokenAuthority', tokenAuthorityResult);
        tokenAuthority = tokenAuthorityResult.account;
        console.log(`    Token Authority: ${tokenAuthority.toString()}`);
      } else {
        throw error;
      }
    }
  } else {
    const tokenAuthorityResult = await deployTokenAuthorityFromConfig(
      provider,
      payer,
      tokenConfig,
      network,
      tokenSymbol,
    );
    registerAddress(network, tokenSymbol, 'tokenAuthority', tokenAuthorityResult);
    tokenAuthority = tokenAuthorityResult.account;
    console.log(`    Token Authority: ${tokenAuthority.toString()}`);
  }

  const { saveAddressesToFile } = await import('../../utils/addressStorage');
  await saveAddressesToFile();

  return {
    acRole,
    mToken,
    tokenAuthority,
  };
}
