use anchor_lang::prelude::*;

use crate::{
    events::AcCreatedEvent,
    state::{AccessControlRoleState, AccessControlState},
};

#[derive(Accounts)]
pub struct NewAccessControl<'info> {
    /// Init payer
    #[account(mut)]
    pub payer: Signer<'info>,

    /// New `AccessControlState` instance
    #[account(
        init,
        payer = payer,
        space = 8 + AccessControlState::INIT_SPACE
    )]
    pub ac: Account<'info, AccessControlState>,

    /// AC Role instance that will be set for a new AC instance
    #[account()]
    pub ac_role: Account<'info, AccessControlRoleState>,

    pub system_program: Program<'info, System>,
}

/// Initializes `ctx.ac` and emits an event
pub fn handle(ctx: Context<NewAccessControl>) -> Result<()> {
    let ac = &mut ctx.accounts.ac;

    ac.ac_role = ctx.accounts.ac_role.key();

    emit!(AcCreatedEvent {
        ac: ac.key(),
        ac_role: ctx.accounts.ac_role.key()
    });

    Ok(())
}
