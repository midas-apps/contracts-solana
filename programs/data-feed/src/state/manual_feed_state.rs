use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
/// Old ManualFeedState
/// Account that holds data of manual data feed
/// where the answer can be controlled by the
/// actors with sufficient access (has `FEED_ADMIN` role)
pub struct ManualFeedState {
    /// Current price
    pub price: u64,
    /// Current price decimals
    pub decimals: u8,
    /// Last time when price was updated timestamp
    pub last_updated_at: u32,
}

#[account]
#[derive(InitSpace)]
/// Account that holds data of manual data feed
/// where the answer can be controlled by the
/// actors with sufficient access (has `FEED_ADMIN` role)
pub struct ManualFeedStateV2 {
    /// Current price
    pub price: u64,
    /// Current price decimals
    pub decimals: u8,
    /// Last time when price was updated timestamp
    pub last_updated_at: u32,
    /// Max answer deviation
    pub max_answer_deviation: u64,
}

impl ManualFeedStateV2 {
    pub const SEED: &'static [u8; 17] = b"manual_feed_state";
}