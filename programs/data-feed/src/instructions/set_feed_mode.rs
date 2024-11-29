use anchor_lang::prelude::*;

use crate::{
    errors::DataFeedError,
    events::SetFeedModeEvent,
    state::{FeedMode, FeedState},
};

#[derive(Accounts)]
pub struct SetFeedMode<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        has_one = authority @ DataFeedError::NotAuthority
    )]
    pub base_feed: Account<'info, FeedState>,
}

pub fn handle(ctx: Context<SetFeedMode>, new_mode: FeedMode) -> Result<()> {
    let state = &mut ctx.accounts.base_feed;

    state.mode = new_mode.clone();

    emit!(SetFeedModeEvent {
        feed: ctx.accounts.base_feed.key(),
        new_mode: new_mode
    });

    Ok(())
}
