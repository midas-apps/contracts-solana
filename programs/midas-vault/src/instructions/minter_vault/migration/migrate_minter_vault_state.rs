use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use token_authority::{
    constants::ac_roles as ac_roles_token_authority, program::TokenAuthority,
    state::TokenAuthorityState,
};

use crate::{
    constants::ac_roles,
    state::{MintVaultRequestState, MinterVaultState, MinterVaultStateV2, VaultCommonState},
    utils::{close_account, minter, Closable},
};

#[derive(Accounts)]
pub struct MigrateMinterVaultState<'info> {
    /// Signer account
    #[account(mut)]
    pub signer: Signer<'info>,

    // /// Vault common state account
    // #[account(
    //     address = minter_vault.common_vault
    // )]
    // pub vault_common: Account<'info, VaultCommonState>,

    // /// Minter vault state account
    // #[account(
    //     mut,
    //     realloc = 8 + MinterVaultStateV2::INIT_SPACE,
    //     realloc::payer = payer,
    //     realloc::zero = false,
    //     seeds = [MinterVaultStateV2::SEED, vault_common.key().as_ref()],
    //     bump
    // )]
    // pub minter_vault: Migration<'info, MinterVaultState, MinterVaultStateV2>,

    /// System program
    pub system_program: Program<'info, System>,
}

// /// Migrates minter vault state from MinterVaultState to MinterVaultStateV2
// pub fn handle(
//     ctx: Context<MigrateMinterVaultState>,
// ) -> Result<()> {
//     // TODO: need to migrate explicitly?
//     Ok(())
// }
