use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct ManualFeedState {
    pub price: u64,
    pub decimals: u8,
    pub last_updated_at: u32,
}

impl ManualFeedState {
    pub const SEED: &[u8; 17] = b"manual_feed_state";
}
