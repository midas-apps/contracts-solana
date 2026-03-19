import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { Transaction } from '@solana/web3.js';

import { executeNetworkScript } from '@/common/scriptRunner';
import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';
import { loadTokenConfig } from '@/scripts/configs/loadTokenConfig';
import { SOLANA_ROLES } from '@/scripts/configs/roles-types';
import { getVaultsProgram } from '@/scripts/deploy/vaults';
import { getTokenAddresses } from '@/scripts/utils/addressQueries';
import { getMtoken, getNetwork } from '@/scripts/utils/argumentParser';
import { getAccountAcRoleStatePda } from '@/test/helpers/ac.helpers';
import { fetchPauseInxState, getPauseInxStatePda } from '@/test/helpers/vaults.helpers';

const main = async (provider: AnchorProvider, payer: Wallet, network: string) => {
  const mtoken = getMtoken();

  // Load configuration (with cross-reference validation for payment tokens)
  console.log('Loading configuration...');
  const config = loadTokenConfig(mtoken, network);
  console.log('✓ Configuration loaded');

  // Get token addresses
  const tokenAddrs = getTokenAddresses(network, mtoken);
  if (!tokenAddrs) {
    throw new Error(`Token addresses not found for ${mtoken} on ${network}`);
  }

  const vaultsProgram = getVaultsProgram(provider);

  const functionsToPause = [
    ...(config.pauseFunctions?.minter || []).map((fn) => ({
      vault: tokenAddrs.minter.commonVault,
      fnId: fn,
    })),
    ...(config.pauseFunctions?.redeemer || []).map((fn) => ({
      vault: tokenAddrs.redeemer.commonVault,
      fnId: fn,
    })),
  ];

  if (functionsToPause.length === 0) {
    throw new Error('No functions to pause');
  }

  console.log(
    `Pausing functions: ${functionsToPause.map((fn) => `${fn.vault.toBase58()}:${fn.fnId}`).join(', ')}`,
  );

  const tx = new Transaction();

  for (const functionToPause of functionsToPause) {
    const pauseInxStatePda = getPauseInxStatePda(functionToPause.vault, functionToPause.fnId);
    const pauseInxState = await fetchPauseInxState(vaultsProgram, pauseInxStatePda, true);

    if (pauseInxState?.paused) {
      console.log(`Function ${functionToPause} is already paused, skipping...`);
      continue;
    }

    if (!pauseInxState) {
      console.log(`Function ${functionToPause} is not initialized, initializing...`);
      tx.add(
        await vaultsProgram.methods
          .newPauseInx(functionToPause.fnId)
          .accountsPartial({
            vaultCommon: functionToPause.vault,
            authority: payer.publicKey,
            authorityAcRole: getAccountAcRoleStatePda(
              tokenAddrs.acRole,
              payer.publicKey,
              SOLANA_ROLES.VAULT_PAUSER,
            ),
            pauseInxState: pauseInxStatePda,
          })
          .instruction(),
      );
    }

    tx.add(
      await vaultsProgram.methods
        .updatePauseInx(functionToPause.fnId, true)
        .accountsPartial({
          vaultCommon: functionToPause.vault,
          authority: payer.publicKey,
          authorityAcRole: getAccountAcRoleStatePda(
            tokenAddrs.acRole,
            payer.publicKey,
            SOLANA_ROLES.VAULT_PAUSER,
          ),
          pauseInxState: pauseInxStatePda,
        })
        .instruction(),
    );
  }

  const txResult = await sendAndWaitForCustomSolanaTxSign(provider, tx, [], {
    action: 'update-vault',
    comment: `Pause functions for ${mtoken}`,
    mToken: mtoken,
    waitForTx: false,
  });

  // Multi-sig - transaction pending approval
  console.log(`   ⏳ Pending approval | TX ID: ${txResult.txId}`);
  return `pending:${txResult.txId}`;
};

const network = getNetwork();
executeNetworkScript(network, main, 'update-vault');
