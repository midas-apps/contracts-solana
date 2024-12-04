use anchor_lang::prelude::*;

use crate::{
    events::FeedUpdatedEvent,
    state::{FeedMode, FeedState},
    utils::update_feed,
};

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
    ac_role: Pubkey,
    underlying_feed: Pubkey,
    mode: FeedMode,
    min_price: u64,
    max_price: u64,
    max_staleness: u32,
) -> Result<()> {
    let state = &mut ctx.accounts.feed;

    update_feed(
        state,
        Some(ac_role),
        Some(underlying_feed),
        Some(mode.clone()),
        Some(min_price),
        Some(max_price),
        Some(max_staleness),
    )?;

    emit!(FeedUpdatedEvent {
        feed: ctx.accounts.feed.key(),
        ac_role: Some(ac_role),
        underlying_feed: Some(underlying_feed),
        mode: Some(mode),
        min_price: Some(min_price),
        max_price: Some(max_price),
        max_staleness: Some(max_staleness)
    });

    Ok(())
}
