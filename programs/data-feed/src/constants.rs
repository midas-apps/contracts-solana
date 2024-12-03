use anchor_lang::prelude::Pubkey;

pub const DEFAULT_PUBKEY: Pubkey = Pubkey::new_from_array([0; 32]);

pub mod ac_roles {
    pub const FEED_ADMIN: &[u8; 15] = b"data_feed_admin";
}
