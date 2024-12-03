use anchor_lang::prelude::*;

use crate::state::{AccessControlRoleState, AccessControlState};

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

    #[account()]
    pub ac_role: Account<'info, AccessControlRoleState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(ctx: Context<NewAccessControl>) -> Result<()> {
    let ac = &mut ctx.accounts.ac;

    ac.ac_role = ctx.accounts.ac_role.key();

    // TODO: emit event
    Ok(())
}
