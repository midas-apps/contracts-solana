use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PauseInxState {}

impl PauseInxState {
    pub const SEED: &[u8; 15] = b"pause_inx_state";
}
