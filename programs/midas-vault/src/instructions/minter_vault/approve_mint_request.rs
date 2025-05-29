use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use token_authority::{
    constants::ac_roles as ac_roles_token_authority, program::TokenAuthority,
    state::TokenAuthorityState,
};

use crate::{
    constants::{ac_roles, ONE},
    events::MinterVaultRequestApprovedEvent,
    state::{MintVaultRequestState, MinterVaultState, VaultCommonState},
    utils::{close_account, mint_token, require_variation_tolerance, Closable},
};

#[derive(Accounts)]
#[instruction(request_id: u64)]
pub struct ApproveMintRequest<'info> {
    /// Account with vault admin role
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK:
    /// request user account
    #[account(
        mut,
        address = mint_request.user
    )]
    pub user_account: AccountInfo<'info>,

    /// Vault common state account
    #[account()]
    pub vault_common: Account<'info, VaultCommonState>,

    /// Admin role of authority
    #[account(
        seeds = [AccountAccessControlRoleState::SEED, vault_common.ac_role.as_ref(), authority.key().as_ref(), ac_roles::VAULT_ADMIN],
        seeds::program = AccessControl::id(),
        bump,
    )]
    pub authority_ac_role: Account<'info, AccountAccessControlRoleState>,

    /// Vault minter role
    #[account(
        seeds = [AccountAccessControlRoleState::SEED, token_authority.ac_role.as_ref(), minter_vault.key().as_ref(), ac_roles_token_authority::M_MINTER],
        seeds::program = AccessControl::id(),
        bump,
    )]
    pub vault_minter_role: Account<'info, AccountAccessControlRoleState>,

    /// Minter vault state account
    #[account(
        mut,
        seeds = [MinterVaultState::SEED, vault_common.key().as_ref()],
        bump
    )]
    pub minter_vault: Account<'info, MinterVaultState>,

    /// Mint vault request state account
    #[account(
        mut,
        seeds = [MintVaultRequestState::SEED, minter_vault.key().as_ref(), &request_id.to_le_bytes()],
        bump
    )]
    pub mint_request: Account<'info, MintVaultRequestState>,

    /// Token authority state account (token-authority program)
    #[account(
        mut,
        address = minter_vault.mint_authority_pda,
        owner = TokenAuthority::id()
    )]
    pub token_authority: Account<'info, TokenAuthorityState>,

    /// mMint ATA of `user_account`
    #[account(
        mut,
        associated_token::token_program = m_mint_token_program,
        associated_token::mint = m_mint,
        associated_token::authority = user_account,
    )]
    pub m_mint_user_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    /// SPL mint account
    #[account(
        mut,
        mint::token_program = m_mint_token_program,
        address = vault_common.m_mint
    )]
    pub m_mint: Box<InterfaceAccount<'info, Mint>>,

    /// SPL token program for mMint
    pub m_mint_token_program: Interface<'info, TokenInterface>,
    /// Token authority program
    pub token_authority_program: Program<'info, TokenAuthority>,
    /// System program
    pub system_program: Program<'info, System>,
}

impl<'info> Closable for ApproveMintRequest<'info> {
    /// close implementation for closing mint request
    /// after it was processed
    fn close(&mut self) -> Result<()> {
        close_account(
            &mut self.mint_request.to_account_info(),
            &mut self.user_account,
            &self.system_program,
        )?;

        Ok(())
    }
}

/// Approves mint request, mints tokens to user account and emits an event.
/// Will close mint request account after processing.
/// Can only be called by the vault admin.
///
/// # Arguments
///
/// - `request_id` - id of the mint request
/// - `new_out_rate` - new out rate for the mint request.
/// Using this value admin can correct the output mToken amount
/// - `is_safe` - if true, will check variation tolerance before minting
pub fn handle(
    ctx: Context<ApproveMintRequest>,
    request_id: u64,
    new_out_rate: u64,
    is_safe: bool,
) -> Result<()> {
    let request = &ctx.accounts.mint_request;

    if is_safe {
        require_variation_tolerance(
            &ctx.accounts.vault_common,
            request.m_mint_rate.into(),
            new_out_rate.into(),
        )?;
    }

    let amount_to_mint = (request.deposited_usd_wo_fees as u128)
        .checked_mul(ONE.into())
        .unwrap()
        .checked_div(new_out_rate.into())
        .unwrap();

    mint_token(
        &ctx.accounts.vault_common.key(),
        &ctx.accounts.minter_vault.to_account_info(),
        &ctx.accounts.user_account.to_account_info(),
        &ctx.accounts.token_authority.to_account_info(),
        &ctx.accounts.vault_minter_role.to_account_info(),
        &ctx.accounts.m_mint.to_account_info(),
        &ctx.accounts.m_mint_user_ata.to_account_info(),
        &ctx.accounts.m_mint_token_program.to_account_info(),
        &ctx.accounts.system_program.to_account_info(),
        &ctx.accounts.token_authority_program.to_account_info(),
        amount_to_mint.try_into().unwrap(),
    )?;

    ctx.accounts.close()?;

    emit!(MinterVaultRequestApprovedEvent {
        common_vault: ctx.accounts.vault_common.key(),
        new_out_rate,
        request_id
    });

    Ok(())
}
