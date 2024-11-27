use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct MinterVaultState {
    pub first_deposit_min_m_tokens: u64,
    pub common_vault: Pubkey,
    pub mint_authority_pda_seed: [u8; 32],
}

impl MinterVaultState {
    pub const SEED: &[u8; 12] = b"minter_vault";
}
