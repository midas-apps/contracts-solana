use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct VaultCommonState {
    /// AccessControl state  (access-control program)
    pub ac: Pubkey,

    /// If vault is paused
    pub paused: bool,
    /// If true - green_list is required for all
    /// mint/redeem operations available for user
    pub greenlist_enforced: bool,
    /// Mint/Redeem request counter
    pub requests_count: u64,

    /// mToken mint
    pub m_mint: Pubkey,
    /// mToken/USD data feed
    pub m_mint_feed: Pubkey,

    // fields that can be modified by update_vault_common inx
    /// AccessControlRole state
    pub ac_role: Pubkey,
    /// Account that will receive tokens after instant/request flows (not ATA)
    pub tokens_receiver: Pubkey,
    /// Account that will receive fees after instant/request flows (not ATA)
    pub fee_receiver: Pubkey,
    /// Fee in % for instant operations
    pub instant_fee: u64,
    /// Daily limit for instant operations in mToken
    pub instant_daily_limit: u128,
    /// Max. price deviation for request approval
    pub variation_tolerance: u64,
    /// Min amount for all operations in mToken
    pub min_amount: u64,

    /// Day index recorded during last vault operation
    pub instant_last_day: u32,
    /// Instant daily limit used. When new day comes
    /// it resets to 0 in calculations
    pub instant_daily_limit_used: u128,
}
