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
}
