use anchor_lang::prelude::*;

use crate::{
    constants::ac_roles,
    events::AccountAcUpdatedEvent,
    state::{AccessControlState, AccountAccessControlRoleState, AccountAccessControlState},
};

#[derive(Accounts)]
pub struct UpdateAccountAccessControl<'info> {
    /// Account with admin role
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK:
    /// `account_ac` owner
    #[account(mut)]
    pub account: AccountInfo<'info>,

    /// AC instance
    #[account()]
    pub ac: Account<'info, AccessControlState>,

    /// `AccountAccessControlState` instance of `account`
    #[account(
        mut,
        seeds = [AccountAccessControlState::SEED, ac.key().as_ref(), account.key().as_ref()],
        bump
    )]
    pub account_ac: Account<'info, AccountAccessControlState>,

    /// Admin role of authority
    #[account(
        seeds = [AccountAccessControlRoleState::SEED, ac.ac_role.key().as_ref(), authority.key().as_ref(), ac_roles::UPDATE_ACCOUNT_AC],
        bump,
    )]
    pub authority_ac_role: Account<'info, AccountAccessControlRoleState>,

    pub system_program: Program<'info, System>,
}

/// Updates data in `account_ac` and emits an event.
///
/// # Arguments
///
/// - `green_listed` - if set, then used as a new green_listed value of an account
/// - `black_listed` - if set, then used as a new black_listed value of an account
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

    emit!(AccountAcUpdatedEvent {
        ac: ctx.accounts.ac.key(),
        account_ac: ctx.accounts.account_ac.key(),
        black_listed,
        green_listed
    });

    Ok(())
}
