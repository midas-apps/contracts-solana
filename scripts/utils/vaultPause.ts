import { createUserError } from '@/common/errorHandler';
import { PauseFunctionsConfig, VaultFunctionName } from '@/scripts/configs/types';
import { VaultActionIds } from '@/test/constants/vaults.constants';

export type VaultType = 'minter' | 'redeemer';

const ACTION_ALIASES: Record<string, VaultActionIds> = {
  mint_instant: VaultActionIds.MINT_INSTANT,
  deposit_instant: VaultActionIds.MINT_INSTANT,
  mint_request: VaultActionIds.MINT_REQUEST,
  deposit_request: VaultActionIds.MINT_REQUEST,
  redeem_instant: VaultActionIds.REDEEM_INSTANT,
  redeem_request: VaultActionIds.REDEEM_REQUEST,
  redeem_request_fiat: VaultActionIds.REDEEM_REQUEST_FIAT,
  redeem_fiat_request: VaultActionIds.REDEEM_REQUEST_FIAT,
};

export interface ConfiguredPauseTarget {
  vault: VaultType;
  action: VaultFunctionName;
  actionId: VaultActionIds;
}

function normalizeAction(action: string): string {
  return action
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replaceAll('-', '_');
}

export function resolveVaultActionId(action: string): VaultActionIds {
  const normalized = normalizeAction(action);
  const actionId = ACTION_ALIASES[normalized];
  if (actionId === undefined) {
    throw createUserError(`Unsupported vault action: ${action}`, [
      `Supported actions: ${Object.keys(ACTION_ALIASES).join(', ')}`,
    ]);
  }
  return actionId;
}

export function validateVaultForAction(vault: VaultType, actionId: VaultActionIds): void {
  const isMinterAction =
    actionId === VaultActionIds.MINT_INSTANT || actionId === VaultActionIds.MINT_REQUEST;
  const isRedeemerAction =
    actionId === VaultActionIds.REDEEM_INSTANT ||
    actionId === VaultActionIds.REDEEM_REQUEST ||
    actionId === VaultActionIds.REDEEM_REQUEST_FIAT;

  if (vault === 'minter' && isRedeemerAction) {
    throw createUserError('redeemer action cannot be used with minter vault');
  }

  if (vault === 'redeemer' && isMinterAction) {
    throw createUserError('minter action cannot be used with redeemer vault');
  }
}

export function getConfiguredPauseTargets(
  pauseFunctions: PauseFunctionsConfig,
): ConfiguredPauseTarget[] {
  const targets: ConfiguredPauseTarget[] = [];

  for (const vault of ['minter', 'redeemer'] as const) {
    for (const action of pauseFunctions[vault] ?? []) {
      const actionId = resolveVaultActionId(action);
      validateVaultForAction(vault, actionId);
      targets.push({ vault, action, actionId });
    }
  }

  return targets;
}
