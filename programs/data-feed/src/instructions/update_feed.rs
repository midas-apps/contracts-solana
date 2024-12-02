use anchor_lang::prelude::*;

use crate::{
    errors::DataFeedError,
    events::FeedUpdatedEvent,
    state::{FeedMode, FeedState},
    utils::update_feed,
};

#[derive(Accounts)]
pub struct UpdateFeed<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
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

    update_feed(
        state,
        authority,
        underlying_feed,
        mode.clone(),
        min_price,
        max_price,
        max_staleness,
    )?;

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
