use anchor_lang::prelude::*;

use crate::{
    constants::ac_roles,
    errors::MidasVaultsError,
    state::{AccessControlState, AccountAccessControlRoleState, AccountAccessControlState},
};

#[derive(Accounts)]
pub struct UpdateAccountAccessControl<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK:
    #[account(mut)]
    pub account: AccountInfo<'info>,

    #[account()]
    pub ac: Account<'info, AccessControlState>,

    #[account(
        mut,
        seeds = [AccountAccessControlState::SEED, ac.key().as_ref(), account.key().as_ref()],
        bump
    )]
    pub account_ac: Account<'info, AccountAccessControlState>,

    #[account(
        seeds = [AccountAccessControlRoleState::SEED, ac.ac_role.key().as_ref(), authority.key().as_ref(), ac_roles::UPDATE_ACCOUNT_AC],
        bump,
    )]
    pub authority_ac_role: Account<'info, AccountAccessControlRoleState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(
    ctx: Context<UpdateAccountAccessControl>,
    green_listed: Option<bool>,
    black_listed: Option<bool>,
) -> Result<()> {
    let state = &mut ctx.accounts.account_ac;

    if let Some(new_green_listed) = green_listed {
        state.green_listed = new_green_listed;
    }

    if let Some(new_black_listed) = black_listed {
        state.black_listed = new_black_listed;
    }

    // TODO: add event
    Ok(())
}
