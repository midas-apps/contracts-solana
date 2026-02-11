import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

import { createUserError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';
import { parsePercent, parseUnits } from '@/test/helpers/common.helpers';
import { getMinterVaultPda } from '@/test/helpers/vaults.helpers';

import { loadTokenConfig } from '../../configs/loadTokenConfig';
import { deployMinterVault } from '../../deploy/vaults';
import {
  getTokenAddresses,
  getTokenAcRoleAddress,
  getAcAddress,
  getAcRoleGlobalAddress,
} from '../../utils/addressQueries';
import { registerAddress } from '../../utils/addressRegistry';
import { saveAddressesToFile } from '../../utils/addressStorage';
import { getMtoken, getNetwork } from '../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Wallet, network: string) {
  const mtoken = getMtoken();

  console.log(`Deploying minter vault for: ${mtoken}`);

  const config = loadTokenConfig(mtoken, network);

  const globalAc = getAcAddress(network);
  if (!globalAc) {
    throw createUserError(`AC not found for network ${network}`, [
      `Run: yarn deploy:global-ac-role --network ${network} && yarn deploy:global-ac --network ${network}`,
    ]);
  }

  const tokenAcRole = getTokenAcRoleAddress(network, mtoken);
  if (!tokenAcRole) {
    throw createUserError(`Token AC Role not found for ${mtoken} on ${network}`, [
      `Run: yarn deploy:token-ac-role --mtoken ${mtoken} --network ${network}`,
    ]);
  }

  const acRoleGlobal = getAcRoleGlobalAddress(network);
  if (acRoleGlobal && tokenAcRole.equals(acRoleGlobal)) {
    throw createUserError(`Token AC Role cannot match global AC Role`, [
      `Token AC Role: ${tokenAcRole.toString()}`,
      `Global AC Role: ${acRoleGlobal.toString()}`,
    ]);
  }

  const tokenAddrs = getTokenAddresses(network, mtoken);
  if (!tokenAddrs) {
    throw createUserError(`Token addresses not found for ${mtoken} on ${network}`, [
      `Run: yarn deploy:token-ac-role --mtoken ${mtoken} --network ${network}`,
    ]);
  }

  if (!tokenAddrs.mToken) {
    throw createUserError(`mToken not found for ${mtoken} on ${network}`, [
      `Run: yarn deploy:token-mint --mtoken ${mtoken} --network ${network}`,
    ]);
  }

  if (!tokenAddrs.mTokenDataFeed) {
    throw createUserError(`mToken Data Feed not found for ${mtoken} on ${network}`, [
      `Run: yarn deploy:token-datafeed --mtoken ${mtoken} --network ${network}`,
    ]);
  }

  if (!tokenAddrs.tokenAuthority) {
    throw createUserError(`Token Authority not found for ${mtoken} on ${network}`, [
      `Run: yarn deploy:token-authority --mtoken ${mtoken} --network ${network}`,
    ]);
  }

  if (!config.minter.tokensReceiver) {
    throw createUserError(`tokensReceiver is not configured for ${mtoken} minter vault`);
  }

  if (!config.minter.feeReceiver) {
    throw createUserError(`feeReceiver is not configured for ${mtoken} minter vault`);
  }

  const minterCommonVault = await deployMinterVault(
    { provider, payer, network },
    {
      acRole: tokenAcRole,
      ac: globalAc,
      mToken: tokenAddrs.mToken,
      mTokenFeed: tokenAddrs.mTokenDataFeed,
      tokenAuthority: tokenAddrs.tokenAuthority.account,
      instantFee: parsePercent(parseFloat(config.minter.instantFee)),
      instantDailyLimit: parseUnits(config.minter.instantDailyLimit),
      variationTolerance: parsePercent(parseFloat(config.minter.variationTolerance)),
      minAmount: parseUnits(config.minter.minAmount),
      firstMintMinMTokens: parseUnits(config.minter.firstMintMinMTokens),
      maxSupplyCap: config.minter.maxSupplyCap ? parseUnits(config.minter.maxSupplyCap) : undefined,
      greenListEnforced: config.minter.greenListEnforced,
      tokensReceiver: new PublicKey(config.minter.tokensReceiver),
      feeReceiver: new PublicKey(config.minter.feeReceiver),
    },
  );
  const minterVaultPda = getMinterVaultPda(minterCommonVault);
  registerAddress(network, mtoken, 'minter', {
    commonVault: minterCommonVault,
    account: minterVaultPda,
  });
  await saveAddressesToFile();

  console.log('✅ Minter vault deployed successfully');
  console.log(`Minter Vault: ${minterCommonVault.toString()}`);
}

const network = getNetwork();
executeNetworkScript(network, main, 'deployer');
