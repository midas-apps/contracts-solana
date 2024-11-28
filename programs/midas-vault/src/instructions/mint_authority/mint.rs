use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint as MintState, TokenAccount, TokenInterface};

use crate::{state::MintAuthorityState, utils::mint_token};

#[derive(Accounts)]
pub struct Mint<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK:
    #[account(mut)]
    pub receiver: UncheckedAccount<'info>,

    #[account(
        seeds = [MintAuthorityState::SEED, mint_authority.base_seed.as_ref()],
        bump,
        has_one = authority
    )]
    pub mint_authority: Account<'info, MintAuthorityState>,

    #[account(
        mut,
        mint::token_program = token_program
    )]
    pub mint: Box<InterfaceAccount<'info, MintState>>,

    #[account(
        mut,
        associated_token::token_program = token_program,
        associated_token::mint = mint,
        associated_token::authority = receiver,
    )]
    pub receiver_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    pub token_program: Interface<'info, TokenInterface>,

    pub system_program: Program<'info, System>,
}

pub fn handle(ctx: Context<Mint>, amount: u64) -> Result<()> {
    mint_token(
        &ctx.accounts.mint_authority.base_seed,
        &ctx.accounts.token_program,
        &ctx.accounts.mint,
        &ctx.accounts.mint_authority.to_account_info(),
        &ctx.accounts.receiver_ata,
        amount,
    )?;

    // TODO: add event
    Ok(())
}
