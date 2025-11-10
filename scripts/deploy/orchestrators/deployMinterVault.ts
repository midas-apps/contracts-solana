import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';

import { MProduct } from '@/common/tokenTypes';
import { parsePercent, parseUnits } from '@/test/helpers/common.helpers';
import { getMinterVaultPda } from '@/test/helpers/vaults.helpers';

import { TokenConfig } from '../../configs/types';
import { getTokenAddresses, getTokenAcRoleAddress, getAcAddress } from '../../utils/addressQueries';
import { verifyDependencies } from '../../utils/dependencyChecker';
import { deployMinterVault, DeployMinterVaultConfig } from '../contracts/vaults';

export interface MinterVaultResult {
  commonVault: PublicKey;
  account: PublicKey;
}

export async function deployMinterVaultFromConfig(
  provider: AnchorProvider,
  payer: Keypair,
  tokenConfig: TokenConfig,
  network: string,
  tokenSymbol: MProduct,
): Promise<MinterVaultResult> {
  verifyDependencies(network, tokenSymbol, [
    'mToken',
    'tokenAuthority',
    'mTokenDataFeed',
    'acRole',
  ]);

  const ac = getAcAddress(network)!;
  const acRole = getTokenAcRoleAddress(network, tokenSymbol)!;
  const tokenAddrs = getTokenAddresses(network, tokenSymbol)!;

  const config: DeployMinterVaultConfig = {
    acRole,
    ac,
    mToken: tokenAddrs.mToken!,
    mTokenFeed: tokenAddrs.mTokenDataFeed!,
    tokenAuthority: tokenAddrs.tokenAuthority!.account,
    instantFee: parsePercent(parseFloat(tokenConfig.minter.instantFee)),
    instantDailyLimit: parseUnits(tokenConfig.minter.instantDailyLimit),
    variationTolerance: parsePercent(parseFloat(tokenConfig.minter.variationTolerance)),
    minAmount: parseUnits(tokenConfig.minter.minAmount),
    firstMintMinMTokens: parseUnits(tokenConfig.minter.firstMintMinMTokens),
    greenListEnforced: tokenConfig.minter.greenListEnforced,
    tokensReceiver: tokenConfig.minter.tokensReceiver
      ? new PublicKey(tokenConfig.minter.tokensReceiver)
      : undefined,
    feeReceiver: tokenConfig.minter.feeReceiver
      ? new PublicKey(tokenConfig.minter.feeReceiver)
      : undefined,
  };

  const commonVault = await deployMinterVault({ provider, payer }, config);
  const minterVaultPda = getMinterVaultPda(commonVault);

  return {
    commonVault,
    account: minterVaultPda,
  };
}
