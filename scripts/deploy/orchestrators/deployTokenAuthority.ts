import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';

import { MProduct } from '@/common/tokenTypes';

import { TokenConfig } from '../../configs/types';
import { getTokenAcRoleAddress, getAcRoleGlobalAddress } from '../../utils/networkResolver';
import { deployTokenAuthority, DeployTokenAuthorityConfig } from '../contracts/token-authority';

export interface TokenAuthorityResult {
  seed: string;
  account: PublicKey;
}

export async function deployTokenAuthorityFromConfig(
  provider: AnchorProvider,
  payer: Keypair,
  tokenConfig: TokenConfig,
  network: string,
  tokenSymbol: MProduct,
): Promise<TokenAuthorityResult> {
  // Get AC Role (try token-specific first, then global)
  let acRole: PublicKey | undefined = getTokenAcRoleAddress(network, tokenSymbol);

  if (!acRole) {
    // Use global AC Role if token-specific doesn't exist yet
    acRole = getAcRoleGlobalAddress(network);
  }

  if (!acRole) {
    throw new Error(`AC Role not found for token ${tokenSymbol} on ${network}`);
  }

  const config: DeployTokenAuthorityConfig = {
    acRole,
    seed: tokenConfig.tokenAuthority.seed,
  };

  const authority = await deployTokenAuthority({ provider, payer }, config);

  return {
    seed: tokenConfig.tokenAuthority.seed,
    account: authority,
  };
}
