use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct VaultCommonAccountState {
    pub free_from_min_amount: bool,
    pub free_from_min_first_mint: bool,
    pub waived_fee: bool,
}

impl VaultCommonAccountState {
    pub const SEED: &'static[u8; 19] = b"vault_account_state";
}
