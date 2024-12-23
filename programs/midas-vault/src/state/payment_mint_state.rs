use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
/// Holds configuration for a specific payment token
pub struct PaymentMintState {
    /// SPL mint of a payment token
    pub mint: Pubkey,
    /// Payment token to USD data feed (data-feed program)
    pub data_feed: Pubkey,
    /// Additional fee for a payment token
    pub fee: u64,
    /// Current allowance for a mint/redeem per payment token
    /// If set to `MAX_UINT128` - it means that its infinite and wont be decreased
    /// during mints/redeems
    pub allowance: u128,
    /// Indicates whether payment token should use 1:1 USD rate or not
    /// (min/max price boundaries should be properly set in `data_feed`)
    pub stable: bool,
}

impl PaymentMintState {
    pub const SEED: &'static [u8; 12] = b"payment_mint";
}
