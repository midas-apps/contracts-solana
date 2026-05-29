import { AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { Transaction } from '@solana/web3.js';

import { createUserError } from '@/common/errorHandler';
import { executeNetworkScript } from '@/common/scriptRunner';
import { sendAndWaitForCustomSolanaTxSign } from '@/common/solanaTxHelper';
import { VAULT_AC_ROLES } from '@/test/constants/vaults.constants';
import { fetchAccountAcRoleState, getAccountAcRoleStatePda } from '@/test/helpers/ac.helpers';
import {
  fetchPauseInxState,
  fetchVaultCommonState,
  getPauseInxStatePda,
} from '@/test/helpers/vaults.helpers';

import { loadTokenConfig } from '../../configs/loadTokenConfig';
import { getAcProgram } from '../../deploy/ac';
import { getVaultsProgram } from '../../deploy/vaults';
import { getTokenAddresses } from '../../utils/addressQueries';
import { getMtoken, getNetwork, getOptionalArg, parseBooleanArg } from '../../utils/argumentParser';
import {
  getConfiguredPauseTargets,
  resolveVaultActionId,
  validateVaultForAction,
  VaultType,
} from '../../utils/vaultPause';

function getVaultType(): VaultType {
  const vault = getOptionalArg('vault') || getOptionalArg('v');
  if (vault === undefined) {
    throw createUserError('Vault is required when --action is provided', [
      'Use --vault minter or --vault redeemer',
    ]);
  }
  if (vault !== 'minter' && vault !== 'redeemer') {
    throw createUserError(`Invalid vault type: "${vault}"`, [
      'Use --vault minter or --vault redeemer',
      'Example: --vault minter --action mint_request --paused true',
    ]);
  }
  return vault;
}

function getAction(): string {
  const action = getOptionalArg('action') || getOptionalArg('a');
  if (!action) {
    throw createUserError('Vault action is required', [
      'Use --action mint_request, redeem_request, or redeem_request_fiat',
    ]);
  }
  return action;
}

function getPaused(): boolean {
  const paused = getOptionalArg('paused');
  if (paused === undefined) {
    throw createUserError('Paused value is required', [
      'Use --paused true to pause or --paused false to unpause',
    ]);
  }
  return parseBooleanArg(paused, 'paused');
}

async function main(provider: AnchorProvider, payer: Wallet) {
  const mtoken = getMtoken();
  const network = getNetwork();
  const vaultArg = getOptionalArg('vault') || getOptionalArg('v');
  const actionArg = getOptionalArg('action') || getOptionalArg('a');
  const paused = getPaused();

  const targets =
    vaultArg || actionArg
      ? [
          {
            vault: getVaultType(),
            action: getAction(),
            actionId: resolveVaultActionId(getAction()),
          },
        ]
      : getConfiguredPauseTargets(
          loadTokenConfig(mtoken, network).postDeploy?.pauseFunctions ?? {},
        );

  if (targets.length === 0) {
    throw createUserError(`No configured pause functions for ${mtoken} on ${network}`, [
      'Provide --vault and --action for a one-off pause update',
      'Or add postDeploy.pauseFunctions to the token config',
    ]);
  }

  const tokenAddrs = getTokenAddresses(network, mtoken);
  const acProgram = getAcProgram(provider);
  const vaultsProgram = getVaultsProgram(provider);

  console.log(`Updating vault pause state for ${mtoken} on ${network}`);
  console.log(`Paused: ${paused}`);

  const tx = new Transaction();

  for (const target of targets) {
    validateVaultForAction(target.vault, target.actionId);

    const vaultCommon =
      target.vault === 'minter'
        ? tokenAddrs?.minter?.commonVault
        : tokenAddrs?.redeemer?.commonVault;

    if (!vaultCommon) {
      throw createUserError(`${target.vault} vault not found for ${mtoken} on ${network}`, [
        `Run the ${target.vault} vault deployment first`,
      ]);
    }

    const commonState = await fetchVaultCommonState(vaultsProgram, vaultCommon);
    const pauseInxState = getPauseInxStatePda(vaultCommon, target.actionId);
    const currentPauseInxState = await fetchPauseInxState(vaultsProgram, pauseInxState, true);
    const authorityAcRole = getAccountAcRoleStatePda(
      commonState.acRole,
      payer.publicKey,
      VAULT_AC_ROLES.VAULT_PAUSER,
    );
    const authorityRoleState = await fetchAccountAcRoleState(acProgram, authorityAcRole, true);

    if (!authorityRoleState) {
      throw createUserError(
        `Current wallet is missing ${VAULT_AC_ROLES.VAULT_PAUSER} for ${target.vault} vault`,
        [
          `Wallet: ${payer.publicKey.toString()}`,
          `AC Role: ${commonState.acRole.toString()}`,
          `Missing role account: ${authorityAcRole.toString()}`,
          `Run: yarn token-ac:grant-operational --mtoken ${mtoken} --network ${network}`,
        ],
      );
    }

    console.log(
      `- ${target.vault} ${target.action} (action id ${target.actionId}) on ${vaultCommon.toString()}`,
    );

    if (!currentPauseInxState) {
      console.log('  pause state account missing; adding initializer');

      tx.add(
        await vaultsProgram.methods
          .newPauseInx(target.actionId)
          .accountsPartial({
            vaultCommon,
            authority: payer.publicKey,
            authorityAcRole,
            pauseInxState,
          })
          .instruction(),
      );

      if (!paused) {
        console.log('  initialized pause state defaults to unpaused; update skipped');
        continue;
      }
    } else if (currentPauseInxState.paused === paused) {
      console.log(`  already ${paused ? 'paused' : 'unpaused'}; skipping`);
      continue;
    }

    tx.add(
      await vaultsProgram.methods
        .updatePauseInx(target.actionId, paused)
        .accountsPartial({
          vaultCommon,
          authority: payer.publicKey,
          authorityAcRole,
          pauseInxState,
        })
        .instruction(),
    );
  }

  if (tx.instructions.length === 0) {
    console.log('No vault pause state changes needed');
    return;
  }

  const result = await sendAndWaitForCustomSolanaTxSign(provider, tx, [], {
    action: 'update-vault',
    comment: `${paused ? 'Pause' : 'Unpause'} ${mtoken} configured vault functions`,
    mToken: mtoken,
    waitForTx: false,
  });

  if (result.signature) {
    console.log(`✅ Vault pause state updated | TX: ${result.signature}`);
  } else {
    console.log(`Transaction created | Fordefi TX ID: ${result.txId}`);
  }
}

const network = getNetwork();
executeNetworkScript(network, main, 'update-vault');
