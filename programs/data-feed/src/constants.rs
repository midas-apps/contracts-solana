use anchor_lang::prelude::Pubkey;

pub const DEFAULT_PUBKEY: Pubkey = Pubkey::new_from_array([0; 32]);

pub mod ac_roles {
    /// Holder of this role can update `FeedState` and `ManualFeedState`
    pub const FEED_ADMIN: &[u8; 15] = b"data_feed_admin";
}
