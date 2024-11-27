use anchor_lang::prelude::*;

use crate::state::MintAuthorityState;

#[derive(Accounts)]
#[instruction(mint_authority_pda_seed: [u8; 32])]
pub struct NewMintAuthority<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    /// CHECK:
    #[account(
        init,
        payer = signer,
        space = 8 + MintAuthorityState::INIT_SPACE,
        seeds = [MintAuthorityState::SEED, mint_authority_pda_seed.as_ref()],
        bump
    )]
    pub mint_authority: Account<'info, MintAuthorityState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(ctx: Context<NewMintAuthority>, _: [u8; 32], authority: Pubkey) -> Result<()> {
    ctx.accounts.mint_authority.authority = authority;

    // TODO: add event
    Ok(())
}
