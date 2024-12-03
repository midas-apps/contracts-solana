use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct AccessControlState {
    pub ac_role: Pubkey,
}
