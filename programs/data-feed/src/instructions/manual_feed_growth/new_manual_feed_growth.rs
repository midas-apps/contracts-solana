use access_control::{
    program::AccessControl,
    state::{AccessControlRoleState, AccountAccessControlRoleState},
};
use anchor_lang::prelude::*;

use crate::{
    constants::ac_roles,
    events::ManualFeedGrowthUpdatedEvent,
    state::{FeedState, ManualFeedGrowthState},
    utils::update_manual_feed_growth,
};

#[derive(Accounts)]
pub struct NewManualFeedGrowth<'info> {
    /// Account with Feed Admin role
    #[account(mut)]
    pub authority: Signer<'info>,

    /// New `ManualFeedGrowthState` instance
    #[account(
        init,
        payer = authority,
        seeds = [ManualFeedGrowthState::SEED, base_feed.key().as_ref()],
        bump,
        space = 8 + ManualFeedGrowthState::INIT_SPACE
    )]
    pub manual_feed_growth: Account<'info, ManualFeedGrowthState>,

    /// AccessControlRoles instance that is set in base_feed
    #[account(
        address = base_feed.ac_role
    )]
    pub ac_role: Account<'info, AccessControlRoleState>,

    /// Feed Admin AC role of `authority`
    #[account(
        seeds = [AccountAccessControlRoleState::SEED, ac_role.key().as_ref(), authority.key().as_ref(), ac_roles::FEED_ADMIN],
        seeds::program = AccessControl::id(),
        bump,
    )]
    pub authority_ac_role: Account<'info, AccountAccessControlRoleState>,

    /// `DataFeed` account
    #[account()]
    pub base_feed: Account<'info, FeedState>,

    pub system_program: Program<'info, System>,
}

/// Initializes new `manual_feed` account
///
/// # Arguments
///
/// - `initial_price` - initial value for `ManualFeedGrowthState.price`
/// - `initial_price_timestamp` - initial price timestamp value for `ManualFeedGrowthState.price_timestamp`
/// - `initial_growth_apr` - initial growth apr value for `ManualFeedGrowthState.growth_apr`
/// - `decimals` - decimals value for `ManualFeedGrowthState.decimals`
/// - `max_answer_deviation` - max answer deviation value for `ManualFeedGrowthState.max_answer_deviation`
/// - `min_growth_apr` - min growth apr value for `ManualFeedGrowthState.min_growth_apr`
/// - `max_growth_apr` - max growth apr value for `ManualFeedGrowthState.max_growth_apr`
/// - `only_up` - only up value for `ManualFeedGrowthState.only_up`
pub fn handle(
    ctx: Context<NewManualFeedGrowth>,
    initial_price: u64,
    initial_price_timestamp: u32,
    initial_growth_apr: i64,
    decimals: u8,
    max_answer_deviation: u64,
    min_growth_apr: i64,
    max_growth_apr: i64,
    only_up: bool,
) -> Result<()> {
    let state = &mut ctx.accounts.manual_feed_growth;

    update_manual_feed_growth(
        state,
        Some(initial_price),
        Some(initial_price_timestamp),
        Some(decimals),
        Some(max_answer_deviation),
        Some(initial_growth_apr),
        Some(min_growth_apr),
        Some(max_growth_apr),
        Some(only_up),
    )?;

    emit!(ManualFeedGrowthUpdatedEvent {
        manual_feed_growth: ctx.accounts.manual_feed_growth.key(),
        base_feed: ctx.accounts.base_feed.key(),
        decimals: Some(decimals),
        price: Some(initial_price),
        price_timestamp: Some(initial_price_timestamp),
        max_answer_deviation: Some(max_answer_deviation),
        growth_apr: Some(initial_growth_apr),
        min_growth_apr: Some(min_growth_apr),
        max_growth_apr: Some(max_growth_apr),
        only_up: Some(only_up),
    });

    Ok(())
}
