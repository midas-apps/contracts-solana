use anchor_lang::prelude::*;

use crate::{
    constants::ac_roles,
    state::{AccessControlRoleState, AccountAccessControlRoleState},
};

#[derive(Accounts)]
#[instruction(role: Vec<u8>)]
pub struct GrantRole<'info> {
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
        init, 
        payer = authority,
        space = 8 + AccountAccessControlRoleState::INIT_SPACE,
        seeds = [AccountAccessControlRoleState::SEED, ac_role.key().as_ref(), account.key().as_ref(), role.as_ref()],
        bump,
    )]
    pub account_ac_role: Account<'info, AccountAccessControlRoleState>,

    pub system_program: Program<'info, System>,
}

// TODO: emit event
pub fn handle(ctx: Context<GrantRole>, role: Vec<u8>) -> Result<()> {
    Ok(())
}
