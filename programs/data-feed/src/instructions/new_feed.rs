use anchor_lang::prelude::*;

use crate::{events::FeedCreatedEvent, state::FeedState};

#[derive(Accounts)]
pub struct NewFeed<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 8 + FeedState::INIT_SPACE
    )]
    pub feed: Account<'info, FeedState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(
    ctx: Context<NewFeed>,
    authority: Pubkey,
    underlying_feed: Pubkey,
    min_price: u64,
    max_price: u64,
    max_staleness: u32,
) -> Result<()> {
    let state = &mut ctx.accounts.feed;

    state.authority = authority;
    state.underlying_feed = underlying_feed;

    state.min_price = min_price;
    state.max_price = max_price;
    state.max_staleness = max_staleness;

    emit!(FeedCreatedEvent {
        feed: ctx.accounts.feed.key(),
        authority,
        underlying_feed,
        min_price,
        max_price,
        max_staleness
    });

    Ok(())
}
