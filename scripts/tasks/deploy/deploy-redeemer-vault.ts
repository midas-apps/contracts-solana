import { AnchorProvider } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';

import { createUserError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';
import { parsePercent, parseUnits } from '@/test/helpers/common.helpers';
import { getRedeemerVaultPda } from '@/test/helpers/vaults.helpers';

import { loadTokenConfig } from '../../configs/loadTokenConfig';
import { deployRedeemerVault } from '../../deploy/vaults';
import {
  getTokenAddresses,
  getTokenAcRoleAddress,
  getAcAddress,
  getAcRoleGlobalAddress,
} from '../../utils/addressQueries';
import { registerAddress } from '../../utils/addressRegistry';
import { saveAddressesToFile } from '../../utils/addressStorage';
import { getMtoken, getNetwork } from '../../utils/argumentParser';

async function main(provider: AnchorProvider, payer: Keypair) {
  const mtoken = getMtoken();
  const network = getNetwork();

  console.log(`Deploying redeemer vault for: ${mtoken}`);

  const config = loadTokenConfig(mtoken, network);

  const globalAc = getAcAddress(network);
  if (!globalAc) {
    throw createUserError(`AC not found for network ${network}`, [
      `Run: yarn deploy:network --network ${network}`,
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

  const redeemerCommonVault = await deployRedeemerVault(
    { provider, payer },
    {
      acRole: tokenAcRole,
      ac: globalAc,
      mToken: tokenAddrs.mToken,
      mTokenFeed: tokenAddrs.mTokenDataFeed,
      instantFee: parsePercent(parseFloat(config.redeemer.instantFee)),
      instantDailyLimit: parseUnits(config.redeemer.instantDailyLimit),
      variationTolerance: parsePercent(parseFloat(config.redeemer.variationTolerance)),
      minAmount: parseUnits(config.redeemer.minAmount),
      minFiatRedeemAmount: parseUnits(config.redeemer.minFiatRedeemAmount),
      fiatFlatFee: parseUnits(config.redeemer.fiatFlatFee),
      greenListEnforced: config.redeemer.greenListEnforced,
      tokensReceiver: config.redeemer.tokensReceiver
        ? new PublicKey(config.redeemer.tokensReceiver)
        : undefined,
      feeReceiver: config.redeemer.feeReceiver
        ? new PublicKey(config.redeemer.feeReceiver)
        : undefined,
      requestRedeemer: config.redeemer.requestRedeemer
        ? new PublicKey(config.redeemer.requestRedeemer)
        : undefined,
    },
  );
  const redeemerVaultPda = getRedeemerVaultPda(redeemerCommonVault);
  registerAddress(network, mtoken, 'redeemer', {
    commonVault: redeemerCommonVault,
    account: redeemerVaultPda,
  });
  await saveAddressesToFile();

  console.log('✅ Redeemer vault deployed successfully');
  console.log(`Redeemer Vault: ${redeemerCommonVault.toString()}`);
}

const network = getNetwork();
executeNetworkScript(network, main);
