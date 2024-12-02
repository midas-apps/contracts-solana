use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct RedeemerVaultState {
    pub min_fiat_redeem_amount: u64,
    pub fiat_additional_fee: u64,
    pub fiat_flat_fee: u64,
    pub common_vault: Pubkey,
}

impl RedeemerVaultState {
    pub const SEED: &[u8; 14] = b"redeemer_vault";
}
