use access_control::{
    program::AccessControl,
    state::{AccessControlRoleState, AccountAccessControlRoleState},
};
use anchor_lang::prelude::*;

use crate::{
    constants::{ac_roles, MAX_TIME_PASSED_SINCE_LAST_UPDATE_GROWTH_FEED},
    errors::DataFeedError,
    events::ManualFeedGrowthUpdatedEvent,
    state::{FeedState, ManualFeedGrowthState},
    utils::{apply_growth_apr, get_current_ts, get_deviation, update_manual_feed_growth},
};

#[derive(Accounts)]
pub struct UpdateManualFeedGrowthPrice<'info> {
    /// Account with Feed Admin role
    #[account(mut)]
    pub authority: Signer<'info>,

    /// `ManualFeedGrowthState` instance
    #[account(
        mut,
        seeds = [ManualFeedGrowthState::SEED, base_feed.key().as_ref()],
        bump,
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
}

/// Updates `manual_feed` price
///
/// # Arguments
///
/// - `price` - new price value for `ManualFeedGrowthState.price`
/// - `price_timestamp` - new price timestamp value for `ManualFeedGrowthState.price_timestamp`
/// - `growth_apr` - new growth apr value for `ManualFeedGrowthState.growth_apr`
/// - `is_safe` - if true, the diviation between new price and current price will be checked if it is within the allowed deviation range
pub fn handle(
    ctx: Context<UpdateManualFeedGrowthPrice>,
    price: u64,
    price_timestamp: u32,
    growth_apr: i64,
    is_safe: bool,
) -> Result<()> {
    let state = &mut ctx.accounts.manual_feed_growth;

    if is_safe {
        let last_price = apply_growth_apr(
            state.price as u128,
            state.growth_apr,
            state.price_timestamp,
            state.decimals,
        )?;

        let new_price =
            apply_growth_apr(price as u128, growth_apr, price_timestamp, state.decimals)?;

        let deviation = get_deviation(last_price, new_price, state.decimals)?;

        require_gte!(
            state.max_answer_deviation as u128,
            deviation,
            DataFeedError::DeviationTooHigh
        );

        if state.only_up {
            require_gte!(growth_apr, 0, DataFeedError::InvalidGrowthApr);
        }

        let current_timestamp = get_current_ts().unwrap();
        let passed_seconds_since_last_update = current_timestamp
            .checked_sub(state.last_updated_at)
            .ok_or(DataFeedError::ArithmeticOverflow)?;

        require_gt!(
            passed_seconds_since_last_update,
            MAX_TIME_PASSED_SINCE_LAST_UPDATE_GROWTH_FEED,
            DataFeedError::NotEnoughTimeHasPassedSinceLastUpdate
        );

        require_gt!(
            price_timestamp,
            state.price_timestamp,
            DataFeedError::InvalidPriceTimestamp
        )
    }

    update_manual_feed_growth(
        state,
        Some(price),
        Some(price_timestamp),
        None,
        None,
        Some(growth_apr),
        None,
        None,
        None,
    )?;

    emit!(ManualFeedGrowthUpdatedEvent {
        manual_feed_growth: ctx.accounts.manual_feed_growth.key(),
        base_feed: ctx.accounts.base_feed.key(),
        decimals: None,
        price: Some(price),
        price_timestamp: Some(price_timestamp),
        max_answer_deviation: None,
        growth_apr: Some(growth_apr),
        min_growth_apr: None,
        max_growth_apr: None,
        only_up: None,
    });

    Ok(())
}
