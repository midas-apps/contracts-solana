import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';

import { MProduct } from '@/common/tokenTypes';
import { parsePercent, parseUnits } from '@/test/helpers/common.helpers';
import { getRedeemerVaultPda } from '@/test/helpers/vaults.helpers';

import { TokenConfig } from '../../configs/types';
import { getTokenAddresses } from '../../utils/addressManager';
import { verifyDependencies } from '../../utils/dependencyChecker';
import { getTokenAcRoleAddress, getAcAddress } from '../../utils/networkResolver';
import { deployRedeemerVault, DeployRedeemerVaultConfig } from '../contracts/vaults';

export interface RedeemerVaultResult {
  commonVault: PublicKey;
  account: PublicKey;
}

export async function deployRedeemerVaultFromConfig(
  provider: AnchorProvider,
  payer: Keypair,
  tokenConfig: TokenConfig,
  network: string,
  tokenSymbol: MProduct,
): Promise<RedeemerVaultResult> {
  verifyDependencies(network, tokenSymbol, ['mToken', 'mTokenDataFeed', 'acRole']);

  const ac = getAcAddress(network)!;
  const acRole = getTokenAcRoleAddress(network, tokenSymbol)!;
  const tokenAddrs = getTokenAddresses(network, tokenSymbol)!;

  const config: DeployRedeemerVaultConfig = {
    acRole,
    ac,
    mToken: tokenAddrs.mToken!,
    mTokenFeed: tokenAddrs.mTokenDataFeed!,
    instantFee: parsePercent(parseFloat(tokenConfig.redeemer.instantFee)),
    instantDailyLimit: parseUnits(tokenConfig.redeemer.instantDailyLimit),
    variationTolerance: parsePercent(parseFloat(tokenConfig.redeemer.variationTolerance)),
    minAmount: parseUnits(tokenConfig.redeemer.minAmount),
    minFiatRedeemAmount: parseUnits(tokenConfig.redeemer.minFiatRedeemAmount),
    fiatFlatFee: parseUnits(tokenConfig.redeemer.fiatFlatFee),
    greenListEnforced: tokenConfig.redeemer.greenListEnforced,
    tokensReceiver: tokenConfig.redeemer.tokensReceiver
      ? new PublicKey(tokenConfig.redeemer.tokensReceiver)
      : undefined,
    feeReceiver: tokenConfig.redeemer.feeReceiver
      ? new PublicKey(tokenConfig.redeemer.feeReceiver)
      : undefined,
    requestRedeemer: tokenConfig.redeemer.requestRedeemer
      ? new PublicKey(tokenConfig.redeemer.requestRedeemer)
      : undefined,
  };

  const commonVault = await deployRedeemerVault({ provider, payer }, config);
  const redeemerVaultPda = getRedeemerVaultPda(commonVault);

  return {
    commonVault,
    account: redeemerVaultPda,
  };
}
