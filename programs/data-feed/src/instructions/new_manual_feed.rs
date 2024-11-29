use anchor_lang::prelude::*;

use crate::{
    errors::DataFeedError,
    events::ManualFeedCreatedEvent,
    state::{FeedState, ManualFeedState},
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
        has_one = authority @ DataFeedError::NotAuthority
    )]
    pub base_feed: Account<'info, FeedState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(ctx: Context<NewManualFeed>, initial_price: u64, decimals: u8) -> Result<()> {
    let state = &mut ctx.accounts.manual_feed;

    state.decimals = decimals;
    state.price = initial_price;

    emit!(ManualFeedCreatedEvent {
        manual_feed: ctx.accounts.manual_feed.key(),
        base_feed: ctx.accounts.base_feed.key(),
        decimals,
        initial_price
    });

    Ok(())
}
