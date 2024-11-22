use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct VaultCommonState {
    pub ac: Pubkey,

    pub paused: bool,
    pub greenlist_enforced: bool,

    pub requests_count: u64,
    pub m_mint: Pubkey,
    pub m_mint_feed: Pubkey,

    // fields that can be modified by update_vault_common inx
    pub authority: Pubkey,
    pub tokens_receiver: Pubkey,
    pub fee_receiver: Pubkey,
    pub instant_fee: u64,
    pub instant_daily_limit: u64,
    pub variation_tolerance: u64,
    pub min_amount: u64,

    pub instant_last_day: u32,
    pub instant_daily_limit_used: u64,
}
