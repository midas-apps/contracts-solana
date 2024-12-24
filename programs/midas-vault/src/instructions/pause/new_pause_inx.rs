use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;

use crate::{
    constants::ac_roles,
    events::PauseInxUpdatedEvent,
    state::{PauseInxState, VaultCommonState},
};

#[derive(Accounts)]
#[instruction(fn_id: u8)]
pub struct NewPauseInx<'info> {
    /// Account with vault pauser role
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Vault common state account
    #[account()]
    pub vault_common: Account<'info, VaultCommonState>,

    /// Pauser role of authority
    #[account(
        seeds = [AccountAccessControlRoleState::SEED, vault_common.ac_role.as_ref(), authority.key().as_ref(), ac_roles::VAULT_PAUSER],
        seeds::program = AccessControl::id(),
        bump,
    )]
    pub authority_ac_role: Account<'info, AccountAccessControlRoleState>,

    /// Pause index state account
    #[account(
        init,
        payer = authority,
        space = 8 + PauseInxState::INIT_SPACE,
        seeds = [PauseInxState::SEED, vault_common.key().as_ref(), fn_id.to_le_bytes().as_ref()],
        bump
    )]
    pub pause_inx_state: Account<'info, PauseInxState>,

    /// System program
    pub system_program: Program<'info, System>,
}

/// Initializes pause inx account and emits an event.
/// Can only be called by the vault pauser.
///
/// # Arguments
///
/// - `fn_id` - instruction id to pause. See `utils::VaultActionId` enum for possible values.
pub fn handle(ctx: Context<NewPauseInx>, fn_id: u8) -> Result<()> {
    emit!(PauseInxUpdatedEvent {
        paused: false,
        fn_id,
        common_vault: ctx.accounts.vault_common.key()
    });

    Ok(())
}
