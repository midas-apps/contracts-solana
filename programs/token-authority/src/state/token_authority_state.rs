use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
///
pub struct TokenAuthorityState {
    /// AccessControlRole account that will be used to manage
    /// the access to the token authority instructions
    pub ac_role: Pubkey,
    /// TokenAuthorityState account PDA seed.
    /// We save it to be able to easily retrieve bump while
    /// doing the token program CPI
    pub base_seed: [u8; 32],
}

impl TokenAuthorityState {
    pub const SEED: &'static [u8; 15] = b"token_authority";
}
