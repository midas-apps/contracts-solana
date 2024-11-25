use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;
pub mod utils;
use instructions::*;

declare_id!("6eFgYZCZZFTe61T4YxWsiHHAunCLTh9V7TAjj8DxuZwm");

#[program]
pub mod midas_vaults {
    use super::*;

    pub fn new_ac(ctx: Context<NewAccessControl>) -> Result<()> {
        Ok(())
    }
}
