use anchor_lang::prelude::*;

use crate::state::{AccountGreenListState, GreenListState};

#[derive(Accounts)]
pub struct AddToGreenList<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        has_one = authority
    )]
    pub greenlist: Account<'info, GreenListState>,

    #[account(
        init,
        payer = authority,
        space = 8 + AccountGreenListState::INIT_SPACE,
        seeds = [AccountGreenListState::SEED, greenlist.key().as_ref()],
        bump
    )]
    pub account_greenlist: Account<'info, AccountGreenListState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(ctx: Context<AddToGreenList>) -> Result<()> {
    // TODO: add event
    Ok(())
}
