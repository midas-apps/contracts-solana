use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
/// State layout for Access Control
/// The purpose of that account is to use it as a base
/// key account to generate PDAs that will hold `AccountAccessControlState`
/// The reason why we dont use AccessControlRoleState for that, is because
/// green_list and black_list can be shared between different mProducts,
/// but different mProducts will have different AccessControlRole assigned
pub struct AccessControlState {
    /// `AccessControlRoleState` account
    pub ac_role: Pubkey,
}
