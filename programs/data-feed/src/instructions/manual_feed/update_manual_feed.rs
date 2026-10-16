use access_control::{
    program::AccessControl,
    state::{AccessControlRoleState, AccountAccessControlRoleState},
};
use anchor_lang::prelude::*;

use crate::{
    constants::ac_roles,
    events::ManualFeedUpdatedEventV2,
    state::{FeedState, ManualFeedState},
    utils::update_manual_feed,
};

#[derive(Accounts)]
pub struct UpdateManualFeed<'info> {
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

/// Updates `manual_feed` account
/// Parameter will be updated only if its not None
///
/// # Arguments
///
/// - `decimals` - new decimals value for `ManualFeedState.decimals`
/// - `max_answer_deviation` - new max answer deviation value for `ManualFeedState.max_answer_deviation`
pub fn handle(
    ctx: Context<UpdateManualFeed>,
    decimals: Option<u8>,
    max_answer_deviation: Option<u64>,
) -> Result<()> {
    let state = &mut ctx.accounts.manual_feed;

    update_manual_feed(state, None, decimals, max_answer_deviation)?;

    emit!(ManualFeedUpdatedEventV2 {
        manual_feed: ctx.accounts.manual_feed.key(),
        base_feed: ctx.accounts.base_feed.key(),
        decimals,
        price: None,
        max_answer_deviation,
    });

    Ok(())
}
