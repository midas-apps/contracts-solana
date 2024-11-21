use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;
pub mod utils;

use instructions::*;

declare_id!("3gzjMNSbos3eXopGnzHqQ137htQwCjG93N4f9T6avoim");

#[program]
pub mod data_feed {
    use super::*;

    pub fn new_feed(
        ctx: Context<NewFeed>,
        authority: Pubkey,
        underlying_feed: Pubkey,
        min_price: u64,
        max_price: u64,
        max_staleness: u32,
    ) -> Result<()> {
        new_feed::handle(
            ctx,
            authority,
            underlying_feed,
            min_price,
            max_price,
            max_staleness,
        )
    }

    pub fn new_manual_feed(ctx: Context<NewManualFeed>, decimals: u8) -> Result<()> {
        new_manual_feed::handle(ctx, decimals)
    }

    pub fn set_feed_mode(
        ctx: Context<SetFeedMode>,
        new_mode: crate::state::FeedMode,
    ) -> Result<()> {
        set_feed_mode::handle(ctx, new_mode)
    }

    pub fn set_manual_price(ctx: Context<SetManualPrice>, new_price: u64) -> Result<()> {
        set_manual_price::handle(ctx, new_price)
    }
}
