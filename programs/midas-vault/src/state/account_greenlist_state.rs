use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct AccountGreenListState {}

impl AccountGreenListState {
    pub const SEED: &[u8; 17] = b"account_greenlist";
}
