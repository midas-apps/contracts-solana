use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct MintAuthorityState {
    pub authority: Pubkey,
}

impl MintAuthorityState {
    pub const SEED: &[u8; 14] = b"mint_authority";
}
