use access_control::{
    program::AccessControl,
    state::{AccessControlRoleState, AccountAccessControlRoleState},
};
use anchor_lang::prelude::*;

use crate::{
    constants::ac_roles,
    events::{ManualFeedUpdatedEventV2},
    state::{FeedState, ManualFeedStateV2},
    utils::update_manual_feed,
};

#[derive(Accounts)]
pub struct NewManualFeedGrowth<'info> {
    /// Account with Feed Admin role
    #[account(mut)]
    pub authority: Signer<'info>,

    /// New `ManualFeedStateV2` instance
    #[account(
        init,
        payer = authority,
        seeds = [ManualFeedStateV2::SEED, base_feed.key().as_ref()],
        bump,
        space = 8 + ManualFeedStateV2::INIT_SPACE
    )]
    pub manual_feed: Account<'info, ManualFeedStateV2>,

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
/// - `initial_price` - initial value for `ManualFeedStateV2.price`
/// - `decimals` - decimals value for `ManualFeedStateV2.decimals`
/// - `max_answer_deviation` - max answer deviation value for `ManualFeedStateV2.max_answer_deviation`
pub fn handle(
    ctx: Context<NewManualFeedGrowth>, 
    initial_price: u64, 
    decimals: u8, 
    max_answer_deviation: u64
) -> Result<()> {
    let state = &mut ctx.accounts.manual_feed;

    update_manual_feed(state, Some(initial_price), Some(decimals), Some(max_answer_deviation))?;

    emit!(ManualFeedUpdatedEventV2 {
        manual_feed: ctx.accounts.manual_feed.key(),
        base_feed: ctx.accounts.base_feed.key(),
        decimals: Some(decimals),
        price: Some(initial_price),
        max_answer_deviation: Some(max_answer_deviation)
    });

    Ok(())
}
