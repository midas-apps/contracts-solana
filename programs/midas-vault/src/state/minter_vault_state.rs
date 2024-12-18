use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct MinterVaultState {
    pub first_deposit_min_m_tokens: u64,
    pub common_vault: Pubkey,
    pub mint_authority_pda: Pubkey,
}

impl MinterVaultState {
    pub const SEED: &'static[u8; 12] = b"minter_vault";
}
