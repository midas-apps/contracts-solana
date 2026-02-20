use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;
pub mod utils;

use instructions::*;

declare_id!("MDF1kkcgJqyizY8k3U1ESAxLBYFYmE3qTwxf2pmGE1s");

#[program]
pub mod data_feed {
    use super::*;

    /* DataFeed instructions */

    pub fn new_feed(
        ctx: Context<NewFeed>,
        ac_role: Pubkey,
        underlying_feed: Pubkey,
        mode: state::FeedMode,
        min_price: u64,
        max_price: u64,
        max_staleness: u32,
    ) -> Result<()> {
        new_feed::handle(
            ctx,
            ac_role,
            underlying_feed,
            mode,
            min_price,
            max_price,
            max_staleness,
        )
    }

    pub fn update_feed(
        ctx: Context<UpdateFeed>,
        ac_role: Option<Pubkey>,
        underlying_feed: Option<Pubkey>,
        mode: Option<state::FeedMode>,
        min_price: Option<u64>,
        max_price: Option<u64>,
        max_staleness: Option<u32>,
    ) -> Result<()> {
        update_feed::handle(
            ctx,
            ac_role,
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
        max_answer_deviation: u64,
    ) -> Result<()> {
        new_manual_feed::handle(ctx, initial_price, decimals, max_answer_deviation)
    }

    pub fn update_manual_feed(
        ctx: Context<UpdateManualFeed>,
        decimals: Option<u8>,
        max_answer_deviation: Option<u64>,
    ) -> Result<()> {
        update_manual_feed::handle(ctx, decimals, max_answer_deviation)
    }

    pub fn update_manual_feed_price(
        ctx: Context<UpdateManualFeedPrice>,
        price: u64,
        is_safe: bool,
    ) -> Result<()> {
        update_manual_feed_price::handle(ctx, price, is_safe)
    }
}
