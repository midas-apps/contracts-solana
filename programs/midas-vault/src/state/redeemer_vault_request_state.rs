use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
/// Redeem request state definition
pub struct RedeemerVaultRequestState {
    /// Request creator pubkey
    pub user: Pubkey,
    /// Payment mint used during the req. creation
    pub payment_mint: Pubkey,
    /// Amount of mToken paid
    pub m_token_amount: u64,
    /// payment_mint/USD price during that was on the moment of
    /// request creation
    pub payment_mint_rate: u64,
    /// mMint/USD price during that was on the moment of
    /// request creation
    pub m_token_rate: u64,
}

impl RedeemerVaultRequestState {
    pub const SEED: &'static [u8; 22] = b"redeemer_vault_request";
}
