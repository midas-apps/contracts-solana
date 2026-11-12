use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;

use crate::{
    constants::ac_roles,
    events::CommonVaultAccountUpdatedEvent,
    state::{VaultCommonAccountState, VaultCommonState},
};

#[derive(Accounts)]
pub struct UpdateVaultCommonAccount<'info> {
    /// Account with vault admin role
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK:
    /// Account to update
    #[account(mut)]
    pub account: AccountInfo<'info>,

    /// Vault common state account
    #[account()]
    pub vault_common: Account<'info, VaultCommonState>,

    /// Admin role of authority
    #[account(
        seeds = [AccountAccessControlRoleState::SEED, vault_common.ac_role.as_ref(), authority.key().as_ref(), ac_roles::VAULT_ADMIN],
        seeds::program = AccessControl::id(),
        bump,
    )]
    pub authority_ac_role: Account<'info, AccountAccessControlRoleState>,

    /// Vault common account
    #[account(
        mut,
        seeds = [VaultCommonAccountState::SEED, vault_common.key().as_ref(), account.key().as_ref()],
        bump
    )]
    pub vault_common_account: Account<'info, VaultCommonAccountState>,

    /// System program
    pub system_program: Program<'info, System>,
}

/// Updates the vault common account with new values and emits an event.
/// Can only be called by the vault admin.
///
/// # Arguments
///
/// - `free_from_min_amount` - new value for `free_from_min_amount`.
///   If true - vault wont check this account for min mint/redeem boundary
/// - `free_from_min_first_mint` - new value for `free_from_min_first_mint`
///   If true - vault wont check this account for min mint boundary on first mint
/// - `waived_fee` - new value for `waived_fee`
///   If true - vault wont charge fee for this account
pub fn handle(
    ctx: Context<UpdateVaultCommonAccount>,
    free_from_min_amount: Option<bool>,
    free_from_min_first_mint: Option<bool>,
    waived_fee: Option<bool>,
) -> Result<()> {
    let state = &mut ctx.accounts.vault_common_account;

    if let Some(free_from_min_amount) = free_from_min_amount {
        state.free_from_min_amount = free_from_min_amount;
    }

    if let Some(free_from_min_first_mint) = free_from_min_first_mint {
        state.free_from_min_first_mint = free_from_min_first_mint;
    }

    if let Some(waived_fee) = waived_fee {
        state.waived_fee = waived_fee;
    }

    emit!(CommonVaultAccountUpdatedEvent {
        account: ctx.accounts.account.key(),
        common_vault: ctx.accounts.vault_common.key(),
        free_from_min_first_mint,
        free_from_min_amount,
        waived_fee,
    });

    Ok(())
}
