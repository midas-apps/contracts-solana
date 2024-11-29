use anchor_lang::prelude::*;

use crate::{errors::DataFeedError, events::SetMinPriceEvent, state::FeedState};

#[derive(Accounts)]
pub struct SetMinPrice<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        has_one = authority @ DataFeedError::NotAuthority
    )]
    pub feed: Account<'info, FeedState>,
}

pub fn handle(ctx: Context<SetMinPrice>, new_min_price: u64) -> Result<()> {
    let state = &mut ctx.accounts.feed;

    state.min_price = new_min_price;

    emit!(SetMinPriceEvent {
        feed: ctx.accounts.feed.key(),
        new_min_price
    });

    Ok(())
}
