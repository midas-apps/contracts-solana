use anchor_lang::prelude::*;

pub mod constants;
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

    /* DataFeed instructions */

    pub fn new_feed(
        ctx: Context<NewFeed>,
        authority: Pubkey,
        underlying_feed: Pubkey,
        mode: state::FeedMode,
        min_price: u64,
        max_price: u64,
        max_staleness: u32,
    ) -> Result<()> {
        new_feed::handle(
            ctx,
            authority,
            underlying_feed,
            mode,
            min_price,
            max_price,
            max_staleness,
        )
    }

    pub fn update_feed(
        ctx: Context<UpdateFeed>,
        authority: Option<Pubkey>,
        underlying_feed: Option<Pubkey>,
        mode: Option<state::FeedMode>,
        min_price: Option<u64>,
        max_price: Option<u64>,
        max_staleness: Option<u32>,
    ) -> Result<()> {
        update_feed::handle(
            ctx,
            authority,
            underlying_feed,
            mode,
            min_price,
            max_price,
            max_staleness,
        )
    }
    /* Manual Underlying Feed instructions */

    pub fn new_manual_feed(
        ctx: Context<NewManualFeed>,
        initial_price: u64,
        decimals: u8,
    ) -> Result<()> {
        new_manual_feed::handle(ctx, initial_price, decimals)
    }

    pub fn update_manual_feed(
        ctx: Context<UpdateManualFeed>,
        price: Option<u64>,
        decimals: Option<u8>,
    ) -> Result<()> {
        update_manual_feed::handle(ctx, price, decimals)
    }
}
