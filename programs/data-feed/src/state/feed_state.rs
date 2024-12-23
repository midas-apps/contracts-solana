use anchor_lang::prelude::*;

use crate::utils::get_price_in_base_9;

#[derive(Clone, anchor_lang::InitSpace, AnchorSerialize, AnchorDeserialize)]
/// Describes types of supported underlying feeds
pub enum FeedMode {
    /// Indicates underlying_feed is `ManualFeedState`
    MANUAL,
    /// Indicates underlying_feed is Switchboard's `PullFeedAccountData`
    SWITCHBOARD,
    /// Indicates underlying_feed is Pyth's `PriceUpdateV2`
    PYTH,
}

#[account]
#[derive(InitSpace)]
/// Account that represents DataFeed instance and
/// holds data related to it. Data can be updated
/// by the actors with sufficient access (has `FEED_ADMIN` role)
pub struct FeedState {
    /// AccessControlRole instance that is gonna be used to control access
    /// to management instructions of data-feed program
    pub ac_role: Pubkey,
    /// Account that holds the price
    pub underlying_feed: Pubkey,
    /// Underlying feed type
    pub mode: FeedMode,
    /// Min price that feed can return
    pub min_price: u64,
    /// Max price that feed can return
    pub max_price: u64,
    /// Max. seconds between last price update and current timestamp.
    pub max_staleness: u32,
}

impl FeedState {
    pub const SEED: &'static [u8; 10] = b"feed_state";

    pub fn get_price_in_base_9<'info>(&self, feed: &AccountInfo<'info>) -> Result<u128> {
        get_price_in_base_9(&self, &feed)
    }
}
