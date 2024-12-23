use anchor_lang::prelude::*;

use crate::{
    constants::ac_roles, events::AccountAcRoleUpdatedEvent, state::{AccessControlRoleState, AccountAccessControlRoleState}
};

#[derive(Accounts)]
#[instruction(role: Vec<u8>)]
pub struct GrantRole<'info> {
    /// Account with admin role
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK:
    /// New role holder
    #[account()]
    pub account: AccountInfo<'info>,

    /// AC Role state account
    #[account(mut)]
    pub ac_role: Account<'info, AccessControlRoleState>,

    /// Admin role of authority
    #[account(
        seeds = [AccountAccessControlRoleState::SEED, ac_role.key().as_ref(), authority.key().as_ref(), ac_roles::ADMIN],
        bump,
    )]
    pub authority_ac_admin_role: Account<'info, AccountAccessControlRoleState>,

    /// Role that will be granted to `account`
    #[account(
        init, 
        payer = authority,
        space = 8 + AccountAccessControlRoleState::INIT_SPACE,
        seeds = [AccountAccessControlRoleState::SEED, ac_role.key().as_ref(), account.key().as_ref(), role.as_ref()],
        bump,
    )]
    pub account_ac_role: Account<'info, AccountAccessControlRoleState>,

    pub system_program: Program<'info, System>,
}


/// Grants `role` to a `ctx.account` and emits an event
/// 
/// # Arguments
/// 
/// - `role` - role identifier
pub fn handle(ctx: Context<GrantRole>, role: Vec<u8>) -> Result<()> {
    emit!(AccountAcRoleUpdatedEvent {
        ac_role: ctx.accounts.ac_role.key(),
        account: ctx.accounts.account.key(),
        role,
        has: true
    });

    Ok(())
}
