use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct AccountAccessControlState {
    pub green_listed: bool,
    pub black_listed: bool,
}

impl AccountAccessControlState {
    pub const SEED: &'static [u8; 10] = b"account_ac";
}
