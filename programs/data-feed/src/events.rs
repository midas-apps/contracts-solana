use anchor_lang::prelude::*;

use crate::state::FeedMode;

#[event]
pub struct FeedUpdatedEvent {
    /// `FeedState` account
    pub feed: Pubkey,
    /// AccessControlRole account
    pub ac_role: Option<Pubkey>,
    /// New underlying feed address
    pub underlying_feed: Option<Pubkey>,
    /// New feed mode
    pub mode: Option<FeedMode>,
    /// New min price
    pub min_price: Option<u64>,
    /// New max price
    pub max_price: Option<u64>,
    /// New max staleness
    pub max_staleness: Option<u32>,
}

#[event]
pub struct ManualFeedUpdatedEvent {
    /// `FeedState` account
    pub base_feed: Pubkey,
    /// Manual feed account
    pub manual_feed: Pubkey,
    /// New Decimals
    pub decimals: Option<u8>,
    /// New price
    pub price: Option<u64>,
}

#[event]
pub struct ManualFeedUpdatedEventV2 {
    /// `FeedState` account
    pub base_feed: Pubkey,
    /// Manual feed account
    pub manual_feed: Pubkey,
    /// New Decimals
    pub decimals: Option<u8>,
    /// New price
    pub price: Option<u64>,
    /// New max answer deviation
    pub max_answer_deviation: Option<u64>,
}
