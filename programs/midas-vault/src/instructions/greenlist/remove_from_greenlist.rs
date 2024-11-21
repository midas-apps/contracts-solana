use anchor_lang::prelude::*;

use crate::state::{AccountGreenListState, GreenListState};

#[derive(Accounts)]
pub struct RemoveFromGreenList<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        has_one = authority
    )]
    pub greenlist: Account<'info, GreenListState>,

    #[account(
        mut,
        seeds = [AccountGreenListState::SEED, greenlist.key().as_ref()],
        bump,
        close = authority
    )]
    pub account_greenlist: Account<'info, AccountGreenListState>,
}

pub fn handle(ctx: Context<RemoveFromGreenList>) -> Result<()> {
    // TODO: add event
    Ok(())
}
