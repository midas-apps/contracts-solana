use anchor_lang::prelude::*;

declare_id!("3gzjMNSbos3eXopGnzHqQ137htQwCjG93N4f9T6avoim");

#[program]
pub mod data_feed {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
