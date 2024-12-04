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
pub struct NewPauseInx<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account()]
    pub vault_common: Account<'info, VaultCommonState>,

    #[account(
        seeds = [AccountAccessControlRoleState::SEED, vault_common.ac_role.as_ref(), authority.key().as_ref(), ac_roles::VAULT_PAUSER],
        seeds::program = AccessControl::id(),
        bump,
    )]
    pub authority_ac_role: Account<'info, AccountAccessControlRoleState>,

    #[account(
        init,
        payer = authority,
        space = 8 + PauseInxState::INIT_SPACE,
        seeds = [PauseInxState::SEED, vault_common.key().as_ref(), fn_id.to_le_bytes().as_ref()],
        bump
    )]
    pub pause_inx_state: Account<'info, PauseInxState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(ctx: Context<NewPauseInx>, fn_id: u8) -> Result<()> {
    emit!(PauseInxUpdatedEvent {
        paused: false,
        fn_id,
        common_vault: ctx.accounts.vault_common.key()
    });

    Ok(())
}
