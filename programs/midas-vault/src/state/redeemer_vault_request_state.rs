use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct RedeemerVaultRequestState {
    pub user: Pubkey,
    pub payment_mint: Pubkey,
    pub m_token_amount: u64,
    pub payment_mint_rate: u64,
    pub m_token_rate: u64,
}

impl RedeemerVaultRequestState {
    pub const SEED: &[u8; 22] = b"redeemer_vault_request";
}
