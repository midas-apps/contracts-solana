use access_control::{
    program::AccessControl,
    state::{AccessControlRoleState, AccountAccessControlRoleState},
};
use anchor_lang::prelude::*;

use crate::{
    constants::ac_roles, errors::DataFeedError, events::ManualFeedUpdatedEventV2, state::{FeedState, ManualFeedState}, utils::{get_deviation, update_manual_feed}
};

#[derive(Accounts)]
pub struct UpdateManualFeedPrice<'info> {
    /// Account with Feed Admin role
    #[account(mut)]
    pub authority: Signer<'info>,

    /// `ManualFeedState` instance
    #[account(
        mut,
        seeds = [ManualFeedState::SEED, base_feed.key().as_ref()],
        bump,
    )]
    pub manual_feed: Account<'info, ManualFeedState>,

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
/// - `price` - new price value for `ManualFeedState.price`
/// - `is_safe` - if true, the diviation between new price and current price will be checked if it is within the allowed deviation range
pub fn handle(ctx: Context<UpdateManualFeedPrice>, price: u64, is_safe: bool) -> Result<()> {
    let state = &mut ctx.accounts.manual_feed;

    if is_safe {
        let deviation = get_deviation(state.price as u128, price as u128, state.decimals)?;
        require_gte!(
            state.max_answer_deviation as u128,
            deviation,
            DataFeedError::DeviationTooHigh
        );
    }

    update_manual_feed(state, Some(price), None, None)?;

    emit!(ManualFeedUpdatedEventV2 {
        manual_feed: ctx.accounts.manual_feed.key(),
        base_feed: ctx.accounts.base_feed.key(),
        decimals: None,
        price: Some(price),
        max_answer_deviation: None,
    });

    Ok(())
}
