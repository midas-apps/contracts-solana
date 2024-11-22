use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct MintVaultRequestState {
    pub user: Pubkey,
    pub payment_mint: Pubkey,
    pub deposited_usd: u64,
    pub deposited_usd_wo_fees: u64,
    pub m_mint_price: u64,
}

impl MintVaultRequestState {
    pub const SEED: &[u8; 18] = b"mint_vault_request";
}
