use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
/// Minting request state definition
pub struct MintVaultRequestState {
    /// Request creator pubkey
    pub user: Pubkey,
    /// Payment mint used during the req. creation
    pub payment_mint: Pubkey,
    /// Deposited of `payment_mint` in USD
    pub deposited_usd: u64,
    /// Deposited of `payment_mint` in USD excluding all fees
    pub deposited_usd_wo_fees: u64,
    /// mMint/USD price during that was on the moment of
    /// request creation
    pub m_mint_rate: u64,
}

impl MintVaultRequestState {
    pub const SEED: &'static [u8; 18] = b"mint_vault_request";
}
