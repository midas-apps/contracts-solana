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
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        address = feed.ac_role
    )]
    pub ac_role: Account<'info, AccessControlRoleState>,

    #[account(
        seeds = [AccountAccessControlRoleState::SEED, ac_role.key().as_ref(), authority.key().as_ref(), ac_roles::FEED_ADMIN],
        seeds::program = AccessControl::id(),
        bump,
    )]
    pub authority_ac_role: Account<'info, AccountAccessControlRoleState>,

    #[account(mut)]
    pub feed: Account<'info, FeedState>,
}

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
