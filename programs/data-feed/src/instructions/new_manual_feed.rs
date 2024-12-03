use access_control::{
    program::AccessControl,
    state::{AccessControlRoleState, AccountAccessControlRoleState},
};
use anchor_lang::prelude::*;

use crate::{
    constants::ac_roles,
    errors::DataFeedError,
    events::ManualFeedCreatedEvent,
    state::{FeedState, ManualFeedState},
    utils::update_manual_feed,
};

#[derive(Accounts)]
pub struct NewManualFeed<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        seeds = [ManualFeedState::SEED, base_feed.key().as_ref()],
        bump,
        space = 8 + ManualFeedState::INIT_SPACE
    )]
    pub manual_feed: Account<'info, ManualFeedState>,

    #[account(
        address = base_feed.ac_role
    )]
    pub ac_role: Account<'info, AccessControlRoleState>,

    #[account(
        seeds = [AccountAccessControlRoleState::SEED, ac_role.key().as_ref(), authority.key().as_ref(), ac_roles::FEED_ADMIN],
        seeds::program = AccessControl::id(),
        bump,
    )]
    pub authority_ac_role: Account<'info, AccountAccessControlRoleState>,

    #[account()]
    pub base_feed: Account<'info, FeedState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(ctx: Context<NewManualFeed>, initial_price: u64, decimals: u8) -> Result<()> {
    let state = &mut ctx.accounts.manual_feed;

    update_manual_feed(state, Some(initial_price), Some(decimals))?;

    emit!(ManualFeedCreatedEvent {
        manual_feed: ctx.accounts.manual_feed.key(),
        base_feed: ctx.accounts.base_feed.key(),
        decimals,
        initial_price
    });

    Ok(())
}
