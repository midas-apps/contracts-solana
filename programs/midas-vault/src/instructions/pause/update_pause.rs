use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;

use crate::{
    constants::ac_roles, errors::MidasVaultsError, events::PauseUpdatedEvent,
    state::VaultCommonState,
};

#[derive(Accounts)]
pub struct UpdatePause<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub vault_common: Account<'info, VaultCommonState>,

    #[account(
        seeds = [AccountAccessControlRoleState::SEED, vault_common.ac_role.as_ref(), authority.key().as_ref(), ac_roles::VAULT_PAUSER],
        seeds::program = AccessControl::id(),
        bump,
    )]
    pub authority_ac_role: Account<'info, AccountAccessControlRoleState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(ctx: Context<UpdatePause>, paused: bool) -> Result<()> {
    ctx.accounts.vault_common.paused = paused;

    emit!(PauseUpdatedEvent {
        paused: paused,
        common_vault: ctx.accounts.vault_common.key()
    });

    Ok(())
}
