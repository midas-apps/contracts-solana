use anchor_lang::prelude::*;

use crate::{events::SetMaxPriceEvent, state::FeedState};

#[derive(Accounts)]
pub struct SetMaxPrice<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        has_one = authority
    )]
    pub feed: Account<'info, FeedState>,
}

pub fn handle(ctx: Context<SetMaxPrice>, new_max_price: u64) -> Result<()> {
    let state = &mut ctx.accounts.feed;

    state.max_price = new_max_price;

    emit!(SetMaxPriceEvent {
        feed: ctx.accounts.feed.key(),
        new_max_price
    });

    Ok(())
}
