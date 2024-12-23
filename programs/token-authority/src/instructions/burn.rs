use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;
use anchor_spl::{token_2022::{burn, Burn as SplBurn}, token_interface::{Mint as SplMint, TokenAccount, TokenInterface}};

use crate::{
    constants::ac_roles, program::TokenAuthority, state::TokenAuthorityState
};

#[derive(Accounts)]
pub struct Burn<'info> {
    /// Account with burner role
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK:
    /// account to burn from
    #[account()]
    pub from: AccountInfo<'info>,

    /// Token authority PDA
    #[account(
        seeds = [TokenAuthorityState::SEED, token_authority.base_seed.as_ref()],
        bump    
    )]
    pub token_authority: Account<'info, TokenAuthorityState>,

    /// `authority` burner role
    #[account(
        seeds = [AccountAccessControlRoleState::SEED, token_authority.ac_role.as_ref(), authority.key().as_ref(), ac_roles::M_BURNER],
        seeds::program = AccessControl::id(),
        bump,
    )]
    pub authority_burn_role: Account<'info, AccountAccessControlRoleState>,

    /// SPL mint account (SplBurn::mint)
    #[account(
        mut,
        mint::token_program = token_program
    )]
    pub mint: Box<InterfaceAccount<'info, SplMint>>,

    /// ATA of `from` (ThawAccount::from)
    #[account(
        mut,
        associated_token::token_program = token_program,
        associated_token::mint = mint,
        associated_token::authority = from,
    )]
    pub from_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    /// SPL token program
    pub token_program: Interface<'info, TokenInterface>,

    pub system_program: Program<'info, System>,
}


/// Does `spl's burn` invocation
/// 
/// # Arguments
/// 
/// - `amount` - amount to burn
pub fn handle(ctx: Context<Burn>, amount: u64) -> Result<()> {
    let (_, vault_pda_bump_seed) = Pubkey::find_program_address(
        &[TokenAuthorityState::SEED, ctx.accounts.token_authority.base_seed.as_ref()],
        &TokenAuthority::id(),
    );

    burn(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            SplBurn {
                authority: ctx.accounts.token_authority.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                from: ctx.accounts.from_ata.to_account_info(),
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
