use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct AccountAccessControlRoleState {}

impl AccountAccessControlRoleState {
    pub const SEED: &'static [u8; 15] = b"account_ac_role";
}
