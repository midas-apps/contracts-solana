use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PaymentMintState {
    pub mint: Pubkey,
    pub data_feed: Pubkey,
    pub fee: u64,
    pub allowance: u128,
    pub stable: bool,
}

impl PaymentMintState {
    pub const SEED: &'static[u8; 12] = b"payment_mint";
}
