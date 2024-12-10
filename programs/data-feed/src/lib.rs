use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;
pub mod utils;

use instructions::*;

declare_id!("7dTNTpTqbHCLxc1FtpCRAq5d4u1Y6WVqrAc1znVGQDxV");

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
