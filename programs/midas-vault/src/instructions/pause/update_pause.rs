use anchor_lang::prelude::*;

use crate::{errors::MidasVaultsError, state::VaultCommonState};

#[derive(Accounts)]
pub struct UpdatePause<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        has_one = authority @ MidasVaultsError::NotAuthority
    )]
    pub vault_common_state: Account<'info, VaultCommonState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(ctx: Context<UpdatePause>, paused: bool) -> Result<()> {
    ctx.accounts.vault_common_state.paused = paused;
    // TODO: add event
    Ok(())
}
