use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
/// State that holds data about vault user
pub struct VaultCommonAccountState {
    /// Indicates if user is free from min. deposit/redeem boundary
    pub free_from_min_amount: bool,
    /// Indicates if user is free from first vault operations
    pub free_from_min_first_mint: bool,
    /// Indicates if user is free from all vault fees
    pub waived_fee: bool,
}

impl VaultCommonAccountState {
    pub const SEED: &'static [u8; 19] = b"vault_account_state";
}
