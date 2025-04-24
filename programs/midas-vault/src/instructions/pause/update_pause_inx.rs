use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;

use crate::{
    constants::ac_roles,
    errors::MidasVaultsError,
    events::PauseInxUpdatedEvent,
    state::{PauseInxState, VaultCommonState},
};

#[derive(Accounts)]
#[instruction(fn_id: u8)]
pub struct UpdatePauseInx<'info> {
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
        mut,
        seeds = [PauseInxState::SEED, vault_common.key().as_ref(), fn_id.to_le_bytes().as_ref()],
        bump
    )]
    pub pause_inx_state: Account<'info, PauseInxState>,

    /// System program
    pub system_program: Program<'info, System>,
}

/// Pauses specific instruction of the vault and emit an event.
/// Can only be called by the vault pauser.
///
/// # Arguments
///
/// - `fn_id` - id of the instruction to pause. See `utils::VaultActionId` enum for possible values.
/// - `paused` - new value for `paused`
pub fn handle(ctx: Context<UpdatePauseInx>, fn_id: u8, paused: bool) -> Result<()> {
    require_neq!(
        ctx.accounts.pause_inx_state.paused,
        paused,
        MidasVaultsError::ValueDidntChange
    );

    ctx.accounts.pause_inx_state.paused = paused;

    emit!(PauseInxUpdatedEvent {
        paused: paused,
        fn_id,
        common_vault: ctx.accounts.vault_common.key()
    });

    Ok(())
}
