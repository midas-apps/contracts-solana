import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';

import { createUserError } from '@/common/errorHandler';
import { MProduct } from '@/common/tokenTypes';

import { TokenConfig } from '../../configs/types';
import { getTokenAcRoleAddress, getAcRoleGlobalAddress } from '../../utils/addressQueries';
import { verifyNetworkInfrastructure } from '../../utils/dependencyChecker';
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
  verifyNetworkInfrastructure(network);

  let acRole: PublicKey | undefined = getTokenAcRoleAddress(network, tokenSymbol);
  if (!acRole) {
    acRole = getAcRoleGlobalAddress(network);
  }

  if (!acRole) {
    throw createUserError(`AC Role not found for token ${tokenSymbol} on ${network}`, [
      `Run: yarn deploy:token-core --mtoken ${tokenSymbol} --network ${network}`,
    ]);
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
