use anchor_lang::prelude::*;

use crate::state::FeedMode;

#[event]
pub struct FeedUpdatedEvent {
    pub feed: Pubkey,
    pub ac_role: Option<Pubkey>,
    pub underlying_feed: Option<Pubkey>,
    pub mode: Option<FeedMode>,
    pub min_price: Option<u64>,
    pub max_price: Option<u64>,
    pub max_staleness: Option<u32>,
}

#[event]
pub struct ManualFeedUpdatedEvent {
    pub base_feed: Pubkey,
    pub manual_feed: Pubkey,
    pub decimals: Option<u8>,
    pub price: Option<u64>,
}
