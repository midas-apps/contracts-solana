use anchor_lang::prelude::Pubkey;

pub const DEFAULT_PUBKEY: Pubkey = Pubkey::new_from_array([0; 32]);

/// Max staleness for the feed in slots (~1 day)
pub const SWITCHBOARD_FEED_MAX_STALENESS: u32 = 216000;
/// Max staleness for the feed in seconds (5 minutes)
pub const PYTH_FEED_MAX_STALENESS: u32 = 5 * 60;
/// Max staleness for the feed in seconds (1 year)
pub const MANUAL_FEED_MAX_STALENESS: u32 = 365 * 86400;
/// Max staleness for the feed in seconds (5 minutes)
pub const CHAINLINK_FEED_MAX_STALENESS: u32 = 5 * 60;

/// Max time that can pass since last update for growth feed in seconds (1 hour)
pub const MAX_TIME_PASSED_SINCE_LAST_UPDATE_GROWTH_FEED: u32 = 3600;

/// Seconds in year
pub const SECONDS_IN_YEAR: u32 = 365 * 86400;

pub mod ac_roles {
    /// Holder of this role can update `FeedState` and `ManualFeedState`
    pub const FEED_ADMIN: &[u8; 15] = b"data_feed_admin";
}
