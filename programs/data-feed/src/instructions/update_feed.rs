use access_control::{
    program::AccessControl,
    state::{AccessControlRoleState, AccountAccessControlRoleState},
};
use anchor_lang::prelude::*;

use crate::{
    constants::ac_roles,
    events::FeedUpdatedEvent,
    state::{FeedMode, FeedState},
    utils::update_feed,
};

#[derive(Accounts)]
pub struct UpdateFeed<'info> {
    /// Account with Feed Admin role
    #[account(mut)]
    pub authority: Signer<'info>,

    /// AccessControlRoles instance that is set in `feed`
    #[account(
        address = feed.ac_role
    )]
    pub ac_role: Account<'info, AccessControlRoleState>,

    /// Feed Admin AC role of `authority`
    #[account(
        seeds = [AccountAccessControlRoleState::SEED, ac_role.key().as_ref(), authority.key().as_ref(), ac_roles::FEED_ADMIN],
        seeds::program = AccessControl::id(),
        bump,
    )]
    pub authority_ac_role: Account<'info, AccountAccessControlRoleState>,

    /// `DataFeed` account to update
    #[account(mut)]
    pub feed: Account<'info, FeedState>,
}

/// Updates `feed` account and emits an event.
/// Parameter will be updated only if its not None
///
/// # Arguments
///
/// - `ac_role` - AccessControlRole instance that will be used to control access
/// to management instructions of data-feed program
/// - `underlying_feed` - Account that holds the price. Currently it might be one of the
/// next supported account types:
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
    ctx: Context<UpdateFeed>,
    ac_role: Option<Pubkey>,
    underlying_feed: Option<Pubkey>,
    mode: Option<FeedMode>,
    min_price: Option<u64>,
    max_price: Option<u64>,
    max_staleness: Option<u32>,
) -> Result<()> {
    let state = &mut ctx.accounts.feed;

    update_feed(
        state,
        ac_role,
        underlying_feed,
        mode.clone(),
        min_price,
        max_price,
        max_staleness,
    )?;

    emit!(FeedUpdatedEvent {
        feed: ctx.accounts.feed.key(),
        ac_role,
        underlying_feed,
        mode: mode.clone(),
        min_price,
        max_price,
        max_staleness
    });

    Ok(())
}
