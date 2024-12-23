use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
/// Holds paused state for a specific inx
pub struct PauseInxState {
    /// paused state
    pub paused: bool,
}

impl PauseInxState {
    pub const SEED: &'static [u8; 15] = b"pause_inx_state";
}
