use anchor_lang::prelude::*;

use crate::{errors::DataFeedError, events::SetUnderlyingFeedEvent, state::FeedState};

#[derive(Accounts)]
pub struct SetUnderlyingFeed<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        has_one = authority @ DataFeedError::NotAuthority
    )]
    pub feed: Account<'info, FeedState>,
}

pub fn handle(ctx: Context<SetUnderlyingFeed>, new_underlying_feed: Pubkey) -> Result<()> {
    let state = &mut ctx.accounts.feed;

    state.underlying_feed = new_underlying_feed;

    emit!(SetUnderlyingFeedEvent {
        feed: ctx.accounts.feed.key(),
        new_underlying_feed
    });

    Ok(())
}
