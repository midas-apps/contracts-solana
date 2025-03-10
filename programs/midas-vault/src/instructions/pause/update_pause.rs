use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;

use crate::{
    constants::ac_roles, errors::MidasVaultsError, events::PauseUpdatedEvent,
    state::VaultCommonState,
};

#[derive(Accounts)]
pub struct UpdatePause<'info> {
    /// Account with vault pauser role
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Vault common state account
    #[account(mut)]
    pub vault_common: Account<'info, VaultCommonState>,

    /// Pauser role of authority
    #[account(
        seeds = [AccountAccessControlRoleState::SEED, vault_common.ac_role.as_ref(), authority.key().as_ref(), ac_roles::VAULT_PAUSER],
        seeds::program = AccessControl::id(),
        bump,
    )]
    pub authority_ac_role: Account<'info, AccountAccessControlRoleState>,

    /// System program
    pub system_program: Program<'info, System>,
}

/// Update pause state of the vault and emit an event.
/// Can only be called by the vault pauser.
///
/// # Arguments
///
/// - `paused` - new value for `paused`
pub fn handle(ctx: Context<UpdatePause>, paused: bool) -> Result<()> {
    require_neq!(
        ctx.accounts.vault_common.paused,
        paused,
        MidasVaultsError::ValueDidntChange
    );

    ctx.accounts.vault_common.paused = paused;

    emit!(PauseUpdatedEvent {
        paused: paused,
        common_vault: ctx.accounts.vault_common.key()
    });

    Ok(())
}
