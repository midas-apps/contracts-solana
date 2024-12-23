use anchor_lang::prelude::*;

use crate::{
    constants::ac_roles,
    events::AcRoleCreatedEvent,
    state::{AccessControlRoleState, AccountAccessControlRoleState},
};

#[derive(Accounts)]
pub struct NewAccessControlRole<'info> {
    /// Init payer and a new holder of Admin role for the new AC instance
    #[account(mut)]
    pub authority: Signer<'info>,

    /// New `AccessControlRoleState` instance
    #[account(
        init,
        payer = authority,
        space = 8 + AccessControlRoleState::INIT_SPACE
    )]
    pub ac_role: Account<'info, AccessControlRoleState>,

    /// New Admin role for `authority`
    #[account(
        init,
        payer = authority,
        space = 8 + AccountAccessControlRoleState::INIT_SPACE,
        seeds = [AccountAccessControlRoleState::SEED, ac_role.key().as_ref(), authority.key().as_ref(), ac_roles::ADMIN],
        bump,
    )]
    pub account_ac_role: Account<'info, AccountAccessControlRoleState>,

    pub system_program: Program<'info, System>,
}

/// Initializes `ctx.account_ac_role`, grants AC Admin role to `ctx.authority` and emits an event
pub fn handle(ctx: Context<NewAccessControlRole>) -> Result<()> {
    emit!(AcRoleCreatedEvent {
        ac_role: ctx.accounts.ac_role.key()
    });

    Ok(())
}
