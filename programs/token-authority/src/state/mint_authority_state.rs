use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct MintAuthorityState {
    pub ac_role: Pubkey,
    pub base_seed: [u8; 32],
}

impl MintAuthorityState {
    pub const SEED: &[u8; 14] = b"mint_authority";
}
