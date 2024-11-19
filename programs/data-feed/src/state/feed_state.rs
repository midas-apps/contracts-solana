use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct FeedState {
    pub authority: Pubkey,
    pub manual_mode_enabled: bool,
    pub target_decimals: u8,
}

impl FeedState {
    pub const SEED: &[u8; 10] = b"feed_state";
}
