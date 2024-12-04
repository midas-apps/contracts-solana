use anchor_lang::prelude::*;

use crate::{
    constants::ac_roles,
    events::AccountAcRoleUpdatedEvent,
    state::{AccessControlRoleState, AccountAccessControlRoleState},
};

#[derive(Accounts)]
#[instruction(role: Vec<u8>)]
pub struct RevokeRole<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK:
    #[account()]
    pub account: AccountInfo<'info>,

    #[account(mut)]
    pub ac_role: Account<'info, AccessControlRoleState>,

    #[account(
        seeds = [AccountAccessControlRoleState::SEED, ac_role.key().as_ref(), authority.key().as_ref(), ac_roles::ADMIN],
        bump,
    )]
    pub authority_ac_admin_role: Account<'info, AccountAccessControlRoleState>,

    #[account(
        mut,
        close = authority,
        seeds = [AccountAccessControlRoleState::SEED, ac_role.key().as_ref(), account.key().as_ref(), role.as_ref()],
        bump,
    )]
    pub account_ac_role: Account<'info, AccountAccessControlRoleState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(ctx: Context<RevokeRole>, role: Vec<u8>) -> Result<()> {
    emit!(AccountAcRoleUpdatedEvent {
        ac_role: ctx.accounts.ac_role.key(),
        account: ctx.accounts.account.key(),
        role,
        has: false
    });

    Ok(())
}
