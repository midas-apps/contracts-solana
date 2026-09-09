use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;
use anchor_spl::{
    token_2022::{thaw_account, ThawAccount},
    token_interface::{Mint as SplMint, TokenAccount, TokenInterface},
};

use crate::{constants::ac_roles, program::TokenAuthority, state::TokenAuthorityState};

#[derive(Accounts)]
pub struct Thaw<'info> {
    /// Account with freezer role
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Token authority PDA
    #[account(
        seeds = [TokenAuthorityState::SEED, token_authority.base_seed.as_ref()],
        bump
    )]
    pub token_authority: Account<'info, TokenAuthorityState>,

    /// `authority` freeze role
    #[account(
        seeds = [AccountAccessControlRoleState::SEED, token_authority.ac_role.as_ref(), authority.key().as_ref(), ac_roles::M_FREEZER],
        seeds::program = AccessControl::id(),
        bump,
    )]
    pub authority_freeze_role: Account<'info, AccountAccessControlRoleState>,

    /// SPL mint account (ThawAccount::mint)
    #[account(
        mut,
        mint::token_program = token_program
    )]
    pub mint: Box<InterfaceAccount<'info, SplMint>>,

    /// Token account to thaw (ThawAccount::account). Canonical ATA is not required.
    #[account(
        mut,
        token::token_program = token_program,
        token::mint = mint,
    )]
    pub to_thaw_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// SPL token program
    pub token_program: Interface<'info, TokenInterface>,

    pub system_program: Program<'info, System>,
}

/// Does `spl's thaw_account` invocation
pub fn handle(ctx: Context<Thaw>) -> Result<()> {
    let (_, vault_pda_bump_seed) = Pubkey::find_program_address(
        &[
            TokenAuthorityState::SEED,
            ctx.accounts.token_authority.base_seed.as_ref(),
        ],
        &TokenAuthority::id(),
    );

    thaw_account(CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        ThawAccount {
            authority: ctx.accounts.token_authority.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            account: ctx.accounts.to_thaw_token_account.to_account_info(),
        },
        &[&[
            TokenAuthorityState::SEED,
            ctx.accounts.token_authority.base_seed.as_ref(),
            &[vault_pda_bump_seed],
        ]],
    ))?;

    Ok(())
}
