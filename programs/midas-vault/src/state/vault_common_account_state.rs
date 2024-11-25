use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct VaultCommonAccountState {
    pub free_from_min_amount: bool,
    pub free_from_min_first_deposit: bool,
    pub waived_fee: bool,
}

impl VaultCommonAccountState {
    pub const SEED: &[u8; 19] = b"vault_account_state";
}
