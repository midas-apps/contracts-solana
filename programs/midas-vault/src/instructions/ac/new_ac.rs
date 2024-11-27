use anchor_lang::prelude::*;

use crate::state::AccessControlState;

#[derive(Accounts)]
pub struct NewAccessControl<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + AccessControlState::INIT_SPACE
    )]
    pub ac: Account<'info, AccessControlState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(ctx: Context<NewAccessControl>, authority: Pubkey) -> Result<()> {
    let ac = &mut ctx.accounts.ac;

    ac.authority = authority;
    ac.enforced = false;

    // TODO: emit event
    Ok(())
}
