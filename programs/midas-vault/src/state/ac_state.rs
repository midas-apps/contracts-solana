use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct AccessControlState {
    pub authority: Pubkey,
    pub enforced: bool,
}
