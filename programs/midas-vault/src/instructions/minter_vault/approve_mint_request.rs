use access_control::{
    program::AccessControl,
    state::{AccountAccessControlRoleState, AccountAccessControlState},
};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use token_authority::{
    constants::ac_roles as ac_roles_token_authority, program::TokenAuthority,
    state::TokenAuthorityState,
};

use crate::{
    constants::ac_roles,
    state::{MintVaultRequestState, MinterVaultState, VaultCommonState},
    utils::{close_account, minter, Closable},
};

#[derive(Accounts)]
#[instruction(request_id: u64)]
pub struct ApproveMintRequest<'info> {
    /// Account with request manager role
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK:
    /// request user account
    #[account(
        mut,
        address = mint_request.user
    )]
    pub user_account: AccountInfo<'info>,

    /// AccountAccessControlState account
    #[account(
            seeds = [AccountAccessControlState::SEED, vault_common.ac.as_ref(), user_account.key().as_ref()],
            seeds::program = AccessControl::id(),
            bump,
        )]
    pub account_ac: Box<Account<'info, AccountAccessControlState>>,

    /// Vault common state account
    #[account(
        address = minter_vault.common_vault
    )]
    pub vault_common: Account<'info, VaultCommonState>,

    /// Request manager role of authority
    #[account(
        seeds = [AccountAccessControlRoleState::SEED, vault_common.ac_role.as_ref(), authority.key().as_ref(), ac_roles::REQUEST_MANAGER],
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
///   Using this value admin can correct the output mToken amount
/// - `is_safe` - if true, will check variation tolerance before minting
/// - `skip_on_supply_cap_exceeded` - if true, will skip minting and return success
pub fn handle(
    ctx: Context<ApproveMintRequest>,
    request_id: u64,
    new_out_rate: u64,
    is_safe: bool,
    skip_on_supply_cap_exceeded: bool,
) -> Result<()> {
    match minter::approve_mint_request(
        &ctx.accounts.mint_request,
        &ctx.accounts.account_ac,
        &ctx.accounts.vault_common,
        &ctx.accounts.minter_vault,
        &ctx.accounts.m_mint,
        &ctx.accounts.m_mint_user_ata,
        &ctx.accounts.m_mint_token_program,
        &ctx.accounts.user_account,
        &ctx.accounts.token_authority,
        &ctx.accounts.vault_minter_role,
        &ctx.accounts.system_program,
        &ctx.accounts.token_authority_program,
        request_id,
        new_out_rate.into(),
        is_safe,
        skip_on_supply_cap_exceeded,
    ) {
        Ok(true) => {
            ctx.accounts.close()?;
            Ok(())
        }
        Ok(false) => Ok(()),
        Err(e) => Err(e),
    }
}
