use anchor_lang::prelude::*;

pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("3gzjMNSbos3eXopGnzHqQ137htQwCjG93N4f9T6avoim");

#[program]
pub mod data_feed {
    use super::*;

    pub fn new_feed(ctx: Context<NewFeed>, authority: Pubkey, target_decimals: u8) -> Result<()> {
        new_feed::handle(ctx, authority, target_decimals)
    }

    pub fn new_manual_feed(ctx: Context<NewManualFeed>, decimals: u8) -> Result<()> {
        new_manual_feed::handle(ctx, decimals)
    }

    pub fn set_manual_mode(ctx: Context<SetManualMode>, enabled: bool) -> Result<()> {
        set_manual_mode::handle(ctx, enabled)
    }

    pub fn set_manual_price(ctx: Context<SetManualPrice>, new_price: u64) -> Result<()> {
        set_manual_price::handle(ctx, new_price)
    }
}
