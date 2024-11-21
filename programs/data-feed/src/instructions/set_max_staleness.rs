use anchor_lang::prelude::*;

use crate::{events::SetMaxStalenessEvent, state::FeedState};

#[derive(Accounts)]
pub struct SetMaxStaleness<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        has_one = authority
    )]
    pub feed: Account<'info, FeedState>,
}

pub fn handle(ctx: Context<SetMaxStaleness>, new_max_staleness: u32) -> Result<()> {
    let state = &mut ctx.accounts.feed;

    state.max_staleness = new_max_staleness;

    emit!(SetMaxStalenessEvent {
        feed: ctx.accounts.feed.key(),
        new_max_staleness
    });

    Ok(())
}
