use anchor_lang::prelude::*;

#[event]
pub struct CommonVaultCreatedEvent {
    pub vault_common: Pubkey,
    pub ac: Pubkey,
    pub ac_role: Pubkey,
    pub m_mint: Pubkey,
    pub m_mint_feed: Pubkey,
    pub tokens_receiver: Pubkey,
    pub fee_receiver: Pubkey,
    pub instant_fee: u64,
    pub instant_daily_limit: u128,
    pub variation_tolerance: u64,
    pub min_amount: u64,
}

#[event]
pub struct CommonVaultUpdatedEvent {
    pub vault_common: Pubkey,
    pub ac_role: Option<Pubkey>,
    pub tokens_receiver: Option<Pubkey>,
    pub fee_receiver: Option<Pubkey>,
    pub instant_fee: Option<u64>,
    pub instant_daily_limit: Option<u128>,
    pub variation_tolerance: Option<u64>,
    pub min_amount: Option<u64>,
}
