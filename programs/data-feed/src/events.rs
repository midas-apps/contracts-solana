use anchor_lang::prelude::*;

use crate::state::FeedMode;

#[event]
pub struct NewFeedCreatedEvent {
    pub feed: Pubkey,
    pub authority: Pubkey,
    pub underlying_feed: Pubkey,
    pub min_price: u64,
    pub max_price: u64,
    pub max_staleness: u32,
}

#[event]
pub struct NewManualFeedCreatedEvent {
    pub feed: Pubkey,
    pub decimals: u8,
}

#[event]
pub struct SetFeedModeEvent {
    pub feed: Pubkey,
    pub new_mode: FeedMode,
}

#[event]
pub struct SetMinPriceEvent {
    pub feed: Pubkey,
    pub new_min_price: u64,
}

#[event]
pub struct SetMaxPriceEvent {
    pub feed: Pubkey,
    pub new_max_price: u64,
}

#[event]
pub struct SetMaxStalenessEvent {
    pub feed: Pubkey,
    pub new_max_staleness: u32,
}

#[event]
pub struct SetUnderlyingFeedEvent {
    pub feed: Pubkey,
    pub new_underlying_feed: Pubkey,
}

#[event]
pub struct SetManualFeedPriceEvent {
    pub feed: Pubkey,
    pub new_price: u64,
}
