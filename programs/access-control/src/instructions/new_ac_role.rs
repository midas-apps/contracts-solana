use anchor_lang::prelude::*;

use crate::{
    constants::ac_roles,
    state::{AccessControlRoleState, AccountAccessControlRoleState},
};

#[derive(Accounts)]
pub struct NewAccessControlRole<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + AccessControlRoleState::INIT_SPACE
    )]
    pub ac_role: Account<'info, AccessControlRoleState>,

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

pub fn handle(ctx: Context<NewAccessControlRole>) -> Result<()> {
    // TODO: emit event
    Ok(())
}
