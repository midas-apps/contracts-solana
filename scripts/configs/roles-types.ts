import { PublicKey } from '@solana/web3.js';
import { z } from 'zod';

const publicKeySchema = z.string().refine(
  (val) => {
    try {
      new PublicKey(val);
      return true;
    } catch {
      return false;
    }
  },
  { message: 'Invalid PublicKey format' },
);

// Token-level operational role configuration (per token per network)
export const grantRolesConfigSchema = z.object({
  tokenManagerAddress: publicKeySchema,
  vaultsManagerAddress: publicKeySchema,
  oracleManagerAddress: publicKeySchema,
});

export type GrantRolesConfig = z.infer<typeof grantRolesConfigSchema>;

export const SOLANA_ROLES = {
  // Access Control Roles
  ADMIN: 'admin_role',
  UPDATE_ACCOUNT_AC: 'update_account_ac_role',

  // Vault Management Roles
  VAULT_ADMIN: 'vault_admin_role',
  VAULT_PAUSER: 'vault_pauser_role',

  // Token Authority Roles
  M_MINTER: 'm_minter_role',
  M_BURNER: 'm_burner_role',
  M_FREEZER: 'm_freezer_role',

  // Data Feed Roles
  FEED_ADMIN: 'data_feed_admin',
} as const;

export const ROLE_GROUPS = {
  // Main AC administrator - can grant/revoke all roles
  ACCESS_CONTROL_ADMIN: [SOLANA_ROLES.ADMIN],

  // Operational role groups (granted after deployer revocation)
  TOKEN_MANAGER: [
    SOLANA_ROLES.UPDATE_ACCOUNT_AC, // Manage blacklist/greenlist
    SOLANA_ROLES.M_MINTER, // Manual mint tokens
    SOLANA_ROLES.M_BURNER, // Manual burn tokens
    SOLANA_ROLES.M_FREEZER, // Freeze/thaw accounts
    SOLANA_ROLES.VAULT_PAUSER, // Pause vault operations
  ],

  VAULTS_MANAGER: [
    SOLANA_ROLES.VAULT_ADMIN, // Manage both minter and redeemer vaults
  ],

  ORACLE_MANAGER: [
    SOLANA_ROLES.FEED_ADMIN, // Update price feeds
  ],
} as const;

// Roles that deployer automatically gets during deployment
export const DEPLOYER_AUTO_ROLES = [
  SOLANA_ROLES.ADMIN, // From new_ac_role
  SOLANA_ROLES.VAULT_ADMIN, // From deployMinterVault
  SOLANA_ROLES.VAULT_PAUSER, // From deployMinterVault
  SOLANA_ROLES.FEED_ADMIN, // From deployManualFeed (if manual feed used)
] as const;
