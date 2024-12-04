use anchor_lang::prelude::*;

use crate::state::TokenAuthorityState;

#[derive(Accounts)]
#[instruction(base_seed: [u8; 32])]
pub struct NewTokenAuthority<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    /// CHECK:
    #[account(
        init,
        payer = signer,
        space = 8 + TokenAuthorityState::INIT_SPACE,
        seeds = [TokenAuthorityState::SEED, base_seed.as_ref()],
        bump
    )]
    pub token_authority: Account<'info, TokenAuthorityState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(ctx: Context<NewTokenAuthority>, base_seed: [u8; 32], ac_role: Pubkey) -> Result<()> {
    ctx.accounts.token_authority.ac_role = ac_role;
    ctx.accounts.token_authority.base_seed = base_seed;

    // TODO: add event
    Ok(())
}
