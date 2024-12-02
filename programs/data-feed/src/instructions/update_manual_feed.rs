use anchor_lang::prelude::*;

use crate::{
    errors::DataFeedError,
    events::ManualFeedUpdatedEvent,
    state::{FeedState, ManualFeedState},
    utils::update_manual_feed,
};

#[derive(Accounts)]
pub struct UpdateManualFeed<'info> {
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

pub fn handle(
    ctx: Context<UpdateManualFeed>,
    price: Option<u64>,
    decimals: Option<u8>,
) -> Result<()> {
    let state = &mut ctx.accounts.manual_feed;

    update_manual_feed(state, price, decimals)?;

    emit!(ManualFeedUpdatedEvent {
        manual_feed: ctx.accounts.manual_feed.key(),
        base_feed: ctx.accounts.base_feed.key(),
        decimals,
        price
    });

    Ok(())
}
