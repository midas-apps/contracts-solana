use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct GreenListState {
    pub authority: Pubkey,
    pub enabled: bool,
}
