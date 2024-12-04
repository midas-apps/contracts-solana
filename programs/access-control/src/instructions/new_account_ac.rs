use anchor_lang::prelude::*;

use crate::{
    events::AccountAcUpdatedEvent,
    state::{AccessControlState, AccountAccessControlState},
};

#[derive(Accounts)]
pub struct NewAccountAccessControl<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    /// CHECK:
    #[account()]
    pub account: AccountInfo<'info>,

    #[account()]
    pub ac: Account<'info, AccessControlState>,

    #[account(
        init,
        payer = signer,
        space = 8 + AccountAccessControlState::INIT_SPACE,
        seeds = [AccountAccessControlState::SEED, ac.key().as_ref(), account.key().as_ref()],
        bump
    )]
    pub account_ac: Account<'info, AccountAccessControlState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(ctx: Context<NewAccountAccessControl>) -> Result<()> {
    emit!(AccountAcUpdatedEvent {
        ac: ctx.accounts.ac.key(),
        account_ac: ctx.accounts.account_ac.key(),
        black_listed: Some(false),
        green_listed: Some(false)
    });

    Ok(())
}
