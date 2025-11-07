import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';

import { MProduct } from '@/common/tokenTypes';
import { parsePercent, parseUnits } from '@/test/helpers/common.helpers';
import { getMinterVaultPda } from '@/test/helpers/vaults.helpers';

import { TokenConfig } from '../../configs/types';
import { getTokenAddresses } from '../../utils/addressManager';
import { getTokenAcRoleAddress, getAcAddress } from '../../utils/networkResolver';
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
  // Get required addresses (from addresses.ts only)
  const ac = getAcAddress(network);
  const acRole = getTokenAcRoleAddress(network, tokenSymbol);

  if (!ac) {
    throw new Error(`AC not found for network ${network}`);
  }
  if (!acRole) {
    throw new Error(`AC Role not found for token ${tokenSymbol} on ${network}`);
  }

  const tokenAddrs = getTokenAddresses(network, tokenSymbol);
  if (!tokenAddrs?.mToken) {
    throw new Error(`Token mint not found for ${tokenSymbol} on ${network}`);
  }
  if (!tokenAddrs?.mTokenDataFeed) {
    throw new Error(`Token data feed not found for ${tokenSymbol} on ${network}`);
  }
  if (!tokenAddrs?.tokenAuthority?.account) {
    throw new Error(`Token authority not found for ${tokenSymbol} on ${network}`);
  }

  const config: DeployMinterVaultConfig = {
    acRole,
    ac,
    mToken: tokenAddrs.mToken,
    mTokenFeed: tokenAddrs.mTokenDataFeed,
    tokenAuthority: tokenAddrs.tokenAuthority.account,
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
