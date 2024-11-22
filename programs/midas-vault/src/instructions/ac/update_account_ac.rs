use anchor_lang::prelude::*;

use crate::state::{AccessControlState, AccountAccessControlState};

#[derive(Accounts)]
pub struct UpdateAccountAccessControl<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub account: AccountInfo<'info>,

    #[account(
        has_one = authority
    )]
    pub ac: Account<'info, AccessControlState>,

    #[account(
        mut,
        seeds = [AccountAccessControlState::SEED, ac.key().as_ref(), account.key().as_ref()],
        bump
    )]
    pub account_ac: Account<'info, AccountAccessControlState>,

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
