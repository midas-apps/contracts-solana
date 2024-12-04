use anchor_lang::prelude::*;
pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
use instructions::*;
pub mod state;

declare_id!("6XqSwGFEuadyqXC9vBLYGJhvQsEVjPdCrtvN6inAb4z3");

#[program]
pub mod token_authority {
    use super::*;

    pub fn new_token_authority(
        ctx: Context<NewTokenAuthority>,
        base_seed: [u8; 32],
        ac_role: Pubkey,
    ) -> Result<()> {
        new_token_authority::handle(ctx, base_seed, ac_role)
    }

    pub fn mint(ctx: Context<Mint>, amount: u64) -> Result<()> {
        mint::handle(ctx, amount)
    }

    pub fn set_authority(
        ctx: Context<SetAuthority>,
        authority_type: u8,
        new_authority: Option<Pubkey>,
    ) -> Result<()> {
        set_authority::handle(ctx, authority_type, new_authority)
    }
}

#[derive(Accounts)]
pub struct Initialize {}
