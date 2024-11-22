use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct VaultCommonAccountState {
    pub greenlist_enforced: bool,
    pub waived_fee: bool,
}
