use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct VaultCommonState {
    pub authority: Pubkey,
    pub paused: bool,
    pub greenlist_enforced: bool,
}
