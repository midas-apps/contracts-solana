use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
/// access-control program do not consume green_listed and black_listed
/// values anywhere, but midas-vaults do. If green_listed is true -
/// then it might open an access to some instruction for a user
/// If black_listed is true - it might restrict some instructions.
/// Please check midas-vaults documentation how exactly those values affects
pub struct AccountAccessControlState {
    /// Is account green listed
    pub green_listed: bool,
    /// Is account black listed listed
    pub black_listed: bool,
}

impl AccountAccessControlState {
    pub const SEED: &'static [u8; 10] = b"account_ac";
}
