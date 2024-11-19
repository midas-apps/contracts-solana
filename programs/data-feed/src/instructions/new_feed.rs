use anchor_lang::prelude::*;

use crate::{events::NewFeedCreatedEvent, state::FeedState};

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

pub fn handle(ctx: Context<NewFeed>, authority: Pubkey, target_decimals: u8) -> Result<()> {
    let state = &mut ctx.accounts.feed;

    state.authority = authority;
    state.target_decimals = target_decimals;

    emit!(NewFeedCreatedEvent {
        feed: ctx.accounts.feed.key(),
        target_decimals: target_decimals
    });

    Ok(())
}
