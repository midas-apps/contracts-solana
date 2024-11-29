use anchor_lang::prelude::*;

use crate::{
    errors::DataFeedError,
    events::FeedUpdatedEvent,
    state::{FeedMode, FeedState},
};

#[derive(Accounts)]
pub struct UpdateFeed<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        has_one = authority @ DataFeedError::NotAuthority
    )]
    pub feed: Account<'info, FeedState>,
}

pub fn handle(
    ctx: Context<UpdateFeed>,
    authority: Option<Pubkey>,
    underlying_feed: Option<Pubkey>,
    mode: Option<FeedMode>,
    min_price: Option<u64>,
    max_price: Option<u64>,
    max_staleness: Option<u32>,
) -> Result<()> {
    let state = &mut ctx.accounts.feed;

    if let Some(authority) = authority {
        state.authority = authority;
    }

    if let Some(underlying_feed) = underlying_feed {
        state.underlying_feed = underlying_feed;
    }

    if let Some(mode) = mode.clone() {
        state.mode = mode;
    }

    if let Some(min_price) = min_price {
        state.min_price = min_price;
    }

    if let Some(max_price) = max_price {
        state.max_price = max_price;
    }

    if let Some(max_staleness) = max_staleness {
        state.max_staleness = max_staleness;
    }

    emit!(FeedUpdatedEvent {
        feed: ctx.accounts.feed.key(),
        authority,
        underlying_feed,
        mode: mode.clone(),
        min_price,
        max_price,
        max_staleness
    });

    Ok(())
}
