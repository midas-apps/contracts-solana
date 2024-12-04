use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct TokenAuthorityState {
    pub ac_role: Pubkey,
    pub base_seed: [u8; 32],
}

impl TokenAuthorityState {
    pub const SEED: &[u8; 15] = b"token_authority";
}
