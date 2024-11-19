use anchor_lang::prelude::*;

#[event]
pub struct NewFeedCreatedEvent {
    pub feed: Pubkey,
    pub target_decimals: u8,
}

#[event]
pub struct NewManualFeedCreatedEvent {
    pub feed: Pubkey,
    pub decimals: u8,
}

#[event]
pub struct SetManualModeEvent {
    pub feed: Pubkey,
    pub enabled: bool,
}

#[event]
pub struct SetManualFeedPriceEvent {
    pub feed: Pubkey,
    pub new_price: u64,
}
