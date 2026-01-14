use anchor_lang::prelude::*;
pub mod constants;
pub mod instructions;
use instructions::*;
pub mod state;

declare_id!("MTA14NBri1ojys9tnxYuRKHTtVNAssT9bHo5Lt21vDa");

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

    pub fn burn(ctx: Context<Burn>, amount: u64) -> Result<()> {
        burn::handle(ctx, amount)
    }

    pub fn freeze(ctx: Context<Freeze>) -> Result<()> {
        freeze::handle(ctx)
    }

    pub fn thaw(ctx: Context<Thaw>) -> Result<()> {
        thaw::handle(ctx)
    }

    pub fn set_authority(
        ctx: Context<SetAuthority>,
        authority_type: u8,
        new_authority: Option<Pubkey>,
    ) -> Result<()> {
        set_authority::handle(ctx, authority_type, new_authority)
    }
}
