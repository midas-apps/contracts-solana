use anchor_lang::prelude::*;

use crate::{
    errors::DataFeedError,
    events::SetManualFeedPriceEvent,
    state::{FeedState, ManualFeedState},
};

#[derive(Accounts)]
pub struct SetManualPrice<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [ManualFeedState::SEED, base_feed.key().as_ref()],
        bump,
    )]
    pub manual_feed: Account<'info, ManualFeedState>,

    #[account(
        has_one = authority @ DataFeedError::NotAuthority
    )]
    pub base_feed: Account<'info, FeedState>,
}

pub fn handle(ctx: Context<SetManualPrice>, new_price: u64) -> Result<()> {
    let state = &mut ctx.accounts.manual_feed;

    state.price = new_price;

    emit!(SetManualFeedPriceEvent {
        feed: ctx.accounts.base_feed.key(),
        new_price
    });

    Ok(())
}
