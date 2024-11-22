use anchor_lang::prelude::*;

use crate::state::AccessControlState;

#[derive(Accounts)]
pub struct SetGreenListEnforced<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        has_one = authority
    )]
    pub ac: Account<'info, AccessControlState>,
}

pub fn handle(ctx: Context<SetGreenListEnforced>, new_value: bool) -> Result<()> {
    let ac = &mut ctx.accounts.ac;

    ac.enforced = new_value;

    // TODO: emit event
    Ok(())
}
