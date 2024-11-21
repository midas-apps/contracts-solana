use anchor_lang::prelude::*;

use crate::state::GreenListState;

#[derive(Accounts)]
pub struct NewGreenlist<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + GreenListState::INIT_SPACE
    )]
    pub greenlist: Account<'info, GreenListState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(ctx: Context<NewGreenlist>, authority: Pubkey) -> Result<()> {
    let greenlist = &mut ctx.accounts.greenlist;

    greenlist.authority = authority;
    greenlist.enforced = false;

    // TODO: emit event
    Ok(())
}
