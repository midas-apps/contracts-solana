use anchor_lang::prelude::*;

use crate::{events::SetManualModeEvent, state::FeedState};

#[derive(Accounts)]
pub struct SetManualMode<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        has_one = authority
    )]
    pub base_feed: Account<'info, FeedState>,
}

pub fn handle(ctx: Context<SetManualMode>, enabled: bool) -> Result<()> {
    let state = &mut ctx.accounts.base_feed;

    state.manual_mode_enabled = enabled;

    emit!(SetManualModeEvent {
        feed: ctx.accounts.base_feed.key(),
        enabled
    });

    Ok(())
}
