use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct PauseInxState {
    pub paused: bool,
}

impl PauseInxState {
    pub const SEED: &[u8; 15] = b"pause_inx_state";
}
