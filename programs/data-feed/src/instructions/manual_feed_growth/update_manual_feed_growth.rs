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
pub struct UpdateManualFeedGrowth<'info> {
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

/// Updates `manual_feed` account
/// Parameter will be updated only if its not None
///
/// # Arguments
///
/// - `decimals` - new decimals value for `ManualFeedGrowthState.decimals`
/// - `max_answer_deviation` - new max answer deviation value for `ManualFeedGrowthState.max_answer_deviation`
/// - `min_growth_apr` - new min growth apr value for `ManualFeedGrowthState.min_growth_apr`
/// - `max_growth_apr` - new max growth apr value for `ManualFeedGrowthState.max_growth_apr`
/// - `only_up` - new only up value for `ManualFeedGrowthState.only_up`
pub fn handle(
    ctx: Context<UpdateManualFeedGrowth>,
    decimals: Option<u8>,
    max_answer_deviation: Option<u64>,
    min_growth_apr: Option<i64>,
    max_growth_apr: Option<i64>,
    only_up: Option<bool>,
) -> Result<()> {
    let state = &mut ctx.accounts.manual_feed_growth;

    update_manual_feed_growth(
        state,
        None,
        None,
        decimals,
        max_answer_deviation,
        None,
        min_growth_apr,
        max_growth_apr,
        only_up,
    )?;

    emit!(ManualFeedGrowthUpdatedEvent {
        manual_feed_growth: ctx.accounts.manual_feed_growth.key(),
        base_feed: ctx.accounts.base_feed.key(),
        decimals,
        price: None,
        price_timestamp: None,
        max_answer_deviation,
        growth_apr: None,
        min_growth_apr,
        max_growth_apr,
        only_up,
    });

    Ok(())
}
