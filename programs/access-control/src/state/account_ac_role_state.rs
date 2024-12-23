use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
/// State account for Account Access Control Role
/// If account is initialized - then user has a specific role
/// If its not initialized - no role assigned
pub struct AccountAccessControlRoleState {}

impl AccountAccessControlRoleState {
    pub const SEED: &'static [u8; 15] = b"account_ac_role";
}
