use anchor_lang::prelude::*;

use crate::utils::get_price_in_base_9;

#[derive(Clone, anchor_lang::InitSpace, AnchorSerialize, AnchorDeserialize)]
pub enum FeedMode {
    MANUAL,
    SWITCHBOARD,
    PYTH,
}

#[account]
#[derive(InitSpace)]
pub struct FeedState {
    pub ac_role: Pubkey,
    pub underlying_feed: Pubkey,
    pub mode: FeedMode,
    pub min_price: u64,
    pub max_price: u64,
    pub max_staleness: u32,
}

impl FeedState {
    pub const SEED: &'static [u8; 10] = b"feed_state";

    pub fn get_price_in_base_9<'info>(&self, feed: &AccountInfo<'info>) -> Result<u128> {
        get_price_in_base_9(&self, &feed)
    }
}
