use anchor_lang::prelude::*;

use crate::state::GreenListState;

#[derive(Accounts)]
pub struct SetGreenListEnforced<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        has_one = authority
    )]
    pub greenlist: Account<'info, GreenListState>,
}

pub fn handle(ctx: Context<SetGreenListEnforced>, new_value: bool) -> Result<()> {
    let greenlist = &mut ctx.accounts.greenlist;

    greenlist.enforced = new_value;

    // TODO: emit event
    Ok(())
}
