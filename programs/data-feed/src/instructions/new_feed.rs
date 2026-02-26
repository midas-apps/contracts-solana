use anchor_lang::prelude::*;

use crate::{
    events::FeedUpdatedEvent,
    state::{FeedMode, FeedState},
    utils::update_feed,
};

#[derive(Accounts)]
pub struct NewFeed<'info> {
    /// Payer and signer
    #[account(mut)]
    pub payer: Signer<'info>,

    /// New `FeedState` instance
    #[account(
        init,
        payer = payer,
        space = 8 + FeedState::INIT_SPACE
    )]
    pub feed: Account<'info, FeedState>,

    pub system_program: Program<'info, System>,
}

/// Initializes new `feed` account and emits an event.
///
/// # Arguments
///
/// - `ac_role` - AccessControlRole instance that will be used to control access
///   to management instructions of data-feed program
/// - `underlying_feed` - Account that holds the price. Currently it might be one of the
///   next supported account types:
/// - PriceUpdateV2 (PYTH)
/// - PullFeedAccountData (Switchboard)
/// - Chainlink OCR2 (Chainlink)
/// - ManualFeedState (Manual)
/// - ManualFeedGrowthState (ManualGrowth)
///
/// - `mode` - type of underlying feed
/// - `min_price` - min_price that feed can return. Should be lower than `max_price`
/// - `max_price` - max_price that feed can return. Should be higher than `min_price`
/// - `max_staleness` - max. seconds between last price update and current timestamp.
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
