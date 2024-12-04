use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;
use anchor_spl::{token_2022::{mint_to, MintTo}, token_interface::{Mint as SplMint, TokenAccount, TokenInterface}};

use crate::{
    constants::ac_roles, program::TokenAuthority, state::TokenAuthorityState
};

#[derive(Accounts)]
pub struct Mint<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK:
    #[account()]
    pub receiver: AccountInfo<'info>,

    #[account(
        seeds = [TokenAuthorityState::SEED, token_authority.base_seed.as_ref()],
        bump    
    )]
    pub token_authority: Account<'info, TokenAuthorityState>,

    #[account(
        seeds = [AccountAccessControlRoleState::SEED, token_authority.ac_role.as_ref(), authority.key().as_ref(), ac_roles::M_MINTER],
        seeds::program = AccessControl::id(),
        bump,
    )]
    pub authority_minter_role: Account<'info, AccountAccessControlRoleState>,

    #[account(
        mut,
        mint::token_program = token_program
    )]
    pub mint: Box<InterfaceAccount<'info, SplMint>>,

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
    let (_, vault_pda_bump_seed) = Pubkey::find_program_address(
        &[TokenAuthorityState::SEED, ctx.accounts.token_authority.base_seed.as_ref()],
        &TokenAuthority::id(),
    );

    mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                authority: ctx.accounts.token_authority.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                to: ctx.accounts.receiver_ata.to_account_info(),
            },
            &[&[
                TokenAuthorityState::SEED,
                ctx.accounts.token_authority.base_seed.as_ref(),
                &[vault_pda_bump_seed],
            ]],
        ),
        amount,
    )?;

    Ok(())
}
