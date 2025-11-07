import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';

import { createMTokenMint } from '@/common/create-mtoken-mint';
import { MProduct } from '@/common/tokenTypes';

import { TokenConfig } from '../../configs/types';
import { registerAddress } from '../../utils/addressManager';
import { verifyNetworkInfrastructure } from '../../utils/dependencyChecker';
import { deployAcRole, DeployAcRoleConfig } from '../contracts/ac';

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
  // Verify network infrastructure exists
  verifyNetworkInfrastructure(network);

  // 1. Deploy AC Role
  console.log('  [1/3] Deploying AC Role...');
  const acRoleConfig: DeployAcRoleConfig = {};
  const acRole = await deployAcRole({ provider, payer }, acRoleConfig);
  registerAddress(network, tokenSymbol, 'acRole', acRole);
  console.log(`    AC Role: ${acRole.toString()}`);

  // 2. Deploy mToken
  console.log('  [2/3] Deploying mToken...');
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
  const mToken = mint.publicKey;
  registerAddress(network, tokenSymbol, 'mToken', mToken);
  console.log(`    mToken: ${mToken.toString()}`);

  // 3. Deploy Token Authority
  console.log('  [3/3] Deploying Token Authority...');
  const tokenAuthorityResult = await deployTokenAuthorityFromConfig(
    provider,
    payer,
    tokenConfig,
    network,
    tokenSymbol,
  );
  registerAddress(network, tokenSymbol, 'tokenAuthority', tokenAuthorityResult);
  const tokenAuthority = tokenAuthorityResult.account;
  console.log(`    Token Authority: ${tokenAuthority.toString()}`);

  return {
    acRole,
    mToken,
    tokenAuthority,
  };
}
