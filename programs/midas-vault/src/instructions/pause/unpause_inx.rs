use anchor_lang::prelude::*;

use crate::state::{PauseInxState, VaultCommonState};

#[derive(Accounts)]
#[instruction(fn_id: u8)]
pub struct UnPauseInx<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        has_one = authority
    )]
    pub vault_common_state: Account<'info, VaultCommonState>,

    #[account(
        mut,
        close = authority,
        seeds = [PauseInxState::SEED, vault_common_state.key().as_ref(), fn_id.to_le_bytes().as_ref()],
        bump
    )]
    pub pause_inx_state: Account<'info, PauseInxState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(ctx: Context<UnPauseInx>, fn_id: u8) -> Result<()> {
    // TODO: add event
    Ok(())
}
