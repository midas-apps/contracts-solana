use anchor_lang::prelude::*;

/* Common Vault Events */
#[event]
pub struct CommonVaultUpdatedEvent {
    pub vault_common: Pubkey,
    pub ac: Option<Pubkey>,
    pub m_mint: Option<Pubkey>,
    pub m_mint_feed: Option<Pubkey>,
    pub ac_role: Option<Pubkey>,
    pub tokens_receiver: Option<Pubkey>,
    pub fee_receiver: Option<Pubkey>,
    pub instant_fee: Option<u64>,
    pub instant_daily_limit: Option<u128>,
    pub variation_tolerance: Option<u64>,
    pub min_amount: Option<u64>,
}

#[event]
pub struct CommonVaultAccountUpdatedEvent {
    pub common_vault: Pubkey,
    pub account: Pubkey,
    pub free_from_min_amount: Option<bool>,
    pub free_from_min_first_mint: Option<bool>,
    pub waived_fee: Option<bool>,
}

#[event]
pub struct PaymentTokenUpdatedEvent {
    pub common_vault: Pubkey,
    pub mint: Pubkey,
    pub data_feed: Option<Pubkey>,
    pub fee: Option<u64>,
    pub allowance: Option<u128>,
    pub stable: Option<bool>,
}

#[event]
pub struct PaymentTokenRemovedEvent {
    pub common_vault: Pubkey,
    pub mint: Pubkey,
}

/* Pause Events */

#[event]
pub struct PauseInxUpdatedEvent {
    pub common_vault: Pubkey,
    pub fn_id: u8,
    pub paused: bool,
}

#[event]
pub struct PauseUpdatedEvent {
    pub common_vault: Pubkey,
    pub paused: bool,
}
