use anchor_lang::prelude::*;

#[derive(Clone, anchor_lang::InitSpace, AnchorSerialize, AnchorDeserialize)]
pub enum FeedMode {
    MANUAL,
    SWITCHBOARD,
}

#[account]
#[derive(InitSpace)]
pub struct FeedState {
    pub authority: Pubkey,
    pub underlying_feed: Pubkey,
    pub mode: FeedMode,
    pub min_price: u64,
    pub max_price: u64,
    pub max_staleness: u32,
}

impl FeedState {
    pub const SEED: &[u8; 10] = b"feed_state";
}
