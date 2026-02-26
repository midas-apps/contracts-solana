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

    // DataFeed instructions

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
    // Manual Underlying Feed instructions

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

    pub fn migrate_manual_feed_to_v2(ctx: Context<MigrateManualFeedToV2>) -> Result<()> {
        migrate_manual_feed_to_v2::handle(ctx)
    }

    // Manual Growth Underlying Feed instructions

    pub fn new_manual_feed_growth(
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
        new_manual_feed_growth::handle(
            ctx,
            initial_price,
            initial_price_timestamp,
            initial_growth_apr,
            decimals,
            max_answer_deviation,
            min_growth_apr,
            max_growth_apr,
            only_up,
        )
    }

    pub fn update_manual_feed_growth(
        ctx: Context<UpdateManualFeedGrowth>,
        decimals: Option<u8>,
        max_answer_deviation: Option<u64>,
        min_growth_apr: Option<i64>,
        max_growth_apr: Option<i64>,
        only_up: Option<bool>,
    ) -> Result<()> {
        update_manual_feed_growth::handle(
            ctx,
            decimals,
            max_answer_deviation,
            min_growth_apr,
            max_growth_apr,
            only_up,
        )
    }

    pub fn update_manual_feed_growth_price(
        ctx: Context<UpdateManualFeedGrowthPrice>,
        price: u64,
        price_timestamp: u32,
        growth_apr: i64,
        is_safe: bool,
    ) -> Result<()> {
        update_manual_feed_growth_price::handle(ctx, price, price_timestamp, growth_apr, is_safe)
    }
}
