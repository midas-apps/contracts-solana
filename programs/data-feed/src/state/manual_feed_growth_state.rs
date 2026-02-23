use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
/// Account that holds data of manual data feed growth
/// where the answer can be controlled by the
/// actors with sufficient access (has `FEED_ADMIN` role)
/// and growth apr % is applied to the answer
pub struct ManualFeedGrowthState {
    /// Current price
    pub price: u64,
    /// Current price decimals
    pub decimals: u8,
    /// Last time when price was updated timestamp
    pub last_updated_at: u32,
    /// Max answer deviation
    pub max_answer_deviation: u64,
    // Growth apr % that will be applied to the answer
    pub growth_apr: u64,
    /// Min growth apr %
    pub min_growth_apr: u64,
    /// Max growth apr %
    pub max_growth_apr: u64,
    /// If true - new price can only be > than the current price
    pub only_up: bool,
}

impl ManualFeedGrowthState {
    pub const SEED: &'static [u8; 24] = b"manual_feed_growth_state";
}