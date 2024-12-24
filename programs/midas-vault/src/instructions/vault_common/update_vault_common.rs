use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;

use crate::{
    constants::ac_roles, events::CommonVaultUpdatedEvent, state::VaultCommonState,
    utils::common_vault::update_common_vault,
};

#[derive(Accounts)]
pub struct UpdateVaultCommon<'info> {
    /// Account with vault admin role
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Vault common state account
    #[account(mut)]
    pub vault_common: Account<'info, VaultCommonState>,

    /// Admin role of authority
    #[account(
        seeds = [AccountAccessControlRoleState::SEED, vault_common.ac_role.as_ref(), authority.key().as_ref(), ac_roles::VAULT_ADMIN],
        seeds::program = AccessControl::id(),
        bump,
    )]
    pub authority_ac_role: Account<'info, AccountAccessControlRoleState>,

    /// System program
    pub system_program: Program<'info, System>,
}

/// Updates the vault common state with new values and emits an event.
/// Can only be called by the vault admin.
///
/// # Arguments
///
/// - `greenlist_enforced` - new value for `greenlist_enforced`
/// - `ac_role` - new value for `ac_role`
/// - `tokens_receiver` - new value for `tokens_receiver`
/// - `fee_receiver` - new value for `fee_receiver`
/// - `instant_fee` - new value for `instant_fee`
/// - `instant_daily_limit` - new value for `instant_daily_limit`
/// - `variation_tolerance` - new value for `variation_tolerance`
/// - `min_amount` - new value for `min_amount`
pub fn handle(
    ctx: Context<UpdateVaultCommon>,
    greenlist_enforced: Option<bool>,
    ac_role: Option<Pubkey>,
    tokens_receiver: Option<Pubkey>,
    fee_receiver: Option<Pubkey>,
    instant_fee: Option<u64>,
    instant_daily_limit: Option<u128>,
    variation_tolerance: Option<u64>,
    min_amount: Option<u64>,
) -> Result<()> {
    let state = &mut ctx.accounts.vault_common;

    update_common_vault(
        state,
        greenlist_enforced,
        ac_role,
        tokens_receiver,
        fee_receiver,
        instant_fee,
        instant_daily_limit,
        variation_tolerance,
        min_amount,
    )?;

    emit!(CommonVaultUpdatedEvent {
        vault_common: ctx.accounts.vault_common.key(),
        greenlist_enforced,
        ac_role,
        tokens_receiver,
        fee_receiver,
        instant_fee,
        instant_daily_limit,
        variation_tolerance,
        min_amount,
        ac: None,
        m_mint: None,
        m_mint_feed: None
    });

    Ok(())
}
