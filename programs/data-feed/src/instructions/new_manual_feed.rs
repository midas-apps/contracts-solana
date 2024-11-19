use anchor_lang::prelude::*;

use crate::{
    events::NewManualFeedCreatedEvent,
    state::{FeedState, ManualFeedState},
};

#[derive(Accounts)]
pub struct NewManualFeed<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        seeds = [ManualFeedState::SEED, base_feed.key().as_ref()],
        bump,
        space = 8 + ManualFeedState::INIT_SPACE
    )]
    pub manual_feed: Account<'info, ManualFeedState>,

    #[account()]
    pub base_feed: Account<'info, FeedState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(ctx: Context<NewManualFeed>, decimals: u8) -> Result<()> {
    let state = &mut ctx.accounts.manual_feed;

    state.decimals = decimals;

    emit!(NewManualFeedCreatedEvent {
        feed: ctx.accounts.manual_feed.key(),
        decimals
    });

    Ok(())
}
