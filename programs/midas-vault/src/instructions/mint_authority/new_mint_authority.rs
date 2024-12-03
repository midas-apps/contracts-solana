use anchor_lang::prelude::*;

use crate::state::MintAuthorityState;

#[derive(Accounts)]
#[instruction(base_seed: [u8; 32])]
pub struct NewMintAuthority<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    /// CHECK:
    #[account(
        init,
        payer = signer,
        space = 8 + MintAuthorityState::INIT_SPACE,
        seeds = [MintAuthorityState::SEED, base_seed.as_ref()],
        bump
    )]
    pub mint_authority: Account<'info, MintAuthorityState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(ctx: Context<NewMintAuthority>, base_seed: [u8; 32], ac_role: Pubkey) -> Result<()> {
    ctx.accounts.mint_authority.ac_role = ac_role;
    ctx.accounts.mint_authority.base_seed = base_seed;

    // TODO: add event
    Ok(())
}
