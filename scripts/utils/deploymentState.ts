import * as fs from 'fs';
import * as path from 'path';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

import { PublicKey } from '@solana/web3.js';

export interface DeploymentState {
  token: string;
  network: string;
  timestamp: number;
  completed: string[];
  pending: string[];
  addresses: Record<string, string>;
  errors: { component: string; error: string; timestamp: number }[];
  transactions: {
    component: string;
    signature: string;
    timestamp: number;
  }[];
}

export const VALID_COMPONENTS = [
  'acRole',
  'mToken',
  'tokenAuthority',
  'dataFeed',
  'minterVault',
  'redeemerVault',
] as const;

export type ComponentName = (typeof VALID_COMPONENTS)[number];

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_DIR = path.join(__dirname, '../../../.deployment-state');

function ensureStateDir(): void {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
}

function getStateFilePath(token: string, network: string): string {
  ensureStateDir();
  return path.join(STATE_DIR, `${token}-${network}.json`);
}

export function loadDeploymentState(token: string, network: string): DeploymentState | null {
  const statePath = getStateFilePath(token, network);
  if (!fs.existsSync(statePath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(statePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`Failed to load deployment state: ${error}`);
    return null;
  }
}

export function createDeploymentState(
  token: string,
  network: string,
  components: string[],
): DeploymentState {
  return {
    token,
    network,
    timestamp: Date.now(),
    completed: [],
    pending: components,
    addresses: {},
    errors: [],
    transactions: [],
  };
}

export function saveDeploymentState(state: DeploymentState): void {
  const statePath = getStateFilePath(state.token, state.network);
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
}

function validateComponentName(component: string): void {
  if (!VALID_COMPONENTS.includes(component as ComponentName)) {
    throw new Error(
      `Invalid component name: '${component}'. Valid components are: ${VALID_COMPONENTS.join(
        ', ',
      )}`,
    );
  }
}

export function markComponentCompleted(
  state: DeploymentState,
  component: string,
  address: PublicKey,
  transactionSignature?: string,
): void {
  validateComponentName(component);

  if (state.completed.includes(component)) {
    console.warn(
      `Component '${component}' is already marked as completed. Skipping duplicate entry.`,
    );
    return;
  }

  state.completed.push(component);
  if (state.pending.includes(component)) {
    state.pending = state.pending.filter((c) => c !== component);
  }

  state.addresses[component] = address.toString();

  if (transactionSignature) {
    state.transactions.push({
      component,
      signature: transactionSignature,
      timestamp: Date.now(),
    });
  }

  saveDeploymentState(state);
}

export function recordComponentError(
  state: DeploymentState,
  component: string,
  error: string,
): void {
  state.errors.push({
    component,
    error,
    timestamp: Date.now(),
  });
  saveDeploymentState(state);
}

export function getDeploymentProgress(state: DeploymentState): {
  completed: number;
  total: number;
  percentage: number;
} {
  const total = state.completed.length + state.pending.length;
  const completed = state.completed.length;
  return {
    completed,
    total,
    percentage: total > 0 ? (completed / total) * 100 : 0,
  };
}

export function canResumeDeployment(state: DeploymentState): boolean {
  return state.pending.length > 0 && state.errors.length === 0;
}

export function clearDeploymentState(token: string, network: string): void {
  const statePath = getStateFilePath(token, network);
  if (fs.existsSync(statePath)) {
    fs.unlinkSync(statePath);
  }
}

export function listDeploymentStates(): {
  token: string;
  network: string;
  state: DeploymentState;
}[] {
  ensureStateDir();
  const files = fs.readdirSync(STATE_DIR).filter((f) => f.endsWith('.json'));
  const states: {
    token: string;
    network: string;
    state: DeploymentState;
  }[] = [];

  for (const file of files) {
    try {
      const content = fs.readFileSync(path.join(STATE_DIR, file), 'utf-8');
      const state = JSON.parse(content) as DeploymentState;
      states.push({
        token: state.token,
        network: state.network,
        state,
      });
    } catch (error) {
      console.warn(`Failed to load state file ${file}: ${error}`);
    }
  }

  return states;
}

export function generateRollbackInstructions(state: DeploymentState): string {
  const instructions: string[] = [
    `Rollback instructions for ${state.token} on ${state.network}:`,
    '',
    'Deployed components:',
  ];

  for (const component of state.completed) {
    const address = state.addresses[component];
    instructions.push(`  - ${component}: ${address}`);
  }

  instructions.push('');
  instructions.push('To rollback, you would need to:');
  instructions.push('  1. Close/delete the deployed accounts (if possible)');
  instructions.push('  2. Clear the deployment state');
  instructions.push(
    `     yarn clear:deployment-state --token ${state.token} --network ${state.network}`,
  );

  if (state.errors.length > 0) {
    instructions.push('');
    instructions.push('Errors encountered:');
    for (const error of state.errors) {
      instructions.push(`  - ${error.component}: ${error.error}`);
    }
  }

  return instructions.join('\n');
}
