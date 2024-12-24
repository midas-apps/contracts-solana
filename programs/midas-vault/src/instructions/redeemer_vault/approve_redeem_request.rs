use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::{
    constants::ac_roles, state::{
         PaymentMintState, RedeemerVaultRequestState, RedeemerVaultState, VaultCommonState
    }, utils::{close_account, redeemer, Closable}
};

#[derive(Accounts)]
#[instruction(request_id: u64)]
pub struct ApproveRedeemRequest<'info> {
    /// Account with vault admin role
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK:
    /// request user account
    #[account(
        mut, 
        address = redeem_request.user
    )]
    pub user_account: AccountInfo<'info>,

    /// CHECK:
    /// request redeemer account
    #[account(
        mut, 
        address = redeemer_vault.request_redeemer
    )]
    pub request_redeemer: AccountInfo<'info>,

    /// Vault common state account
    #[account(
        mut,
        address = redeemer_vault.common_vault
    )]
    pub vault_common: Account<'info, VaultCommonState>,

    /// Admin role of authority
    #[account(
        seeds = [AccountAccessControlRoleState::SEED, vault_common.ac_role.as_ref(), authority.key().as_ref(), ac_roles::VAULT_ADMIN],
        seeds::program = AccessControl::id(),
        bump,
    )]
    pub authority_ac_role: Account<'info, AccountAccessControlRoleState>,

    /// Redeemer vault state account
    #[account(
        mut,
        seeds = [RedeemerVaultState::SEED, vault_common.key().as_ref()],
        bump
    )]
    pub redeemer_vault: Account<'info, RedeemerVaultState>,

    /// Payment mint state account
    #[account(
        mut,
        seeds = [PaymentMintState::SEED, vault_common.key().as_ref(), payment_mint.key().as_ref()], bump )]
    pub payment_mint_state: Account<'info, PaymentMintState>,

    /// Redeem request state account
    #[account(
        mut,
        seeds = [RedeemerVaultRequestState::SEED, redeemer_vault.key().as_ref(), &request_id.to_le_bytes()],
        bump
    )]
    pub redeem_request: Account<'info, RedeemerVaultRequestState>,

    /// Payment mint user ATA
    #[account(
        mut,
        associated_token::token_program = payment_mint_token_program,
        associated_token::mint = payment_mint,
        associated_token::authority = user_account,
    )]
    pub payment_mint_user_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    /// Payment mint SPL account
    #[account(
        mut,
        mint::token_program = payment_mint_token_program,
        address = redeem_request.payment_mint
    )]
    pub payment_mint: Box<InterfaceAccount<'info, Mint>>,

    /// payment mint redeemer ATA
    #[account(
        mut,
        associated_token::token_program = payment_mint_token_program,
        associated_token::mint = payment_mint,
        associated_token::authority = request_redeemer,
    )]
    pub payment_mint_redeemer_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    /// mMint vault ATA
    #[account(
        mut,
        associated_token::token_program = m_mint_token_program,
        associated_token::mint = m_mint,
        associated_token::authority = redeemer_vault,
    )]
    pub m_mint_vault_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    /// mMint SPL account
    #[account(
        mut,
        mint::token_program = m_mint_token_program,
        address = vault_common.m_mint
    )]
    pub m_mint: Box<InterfaceAccount<'info, Mint>>,

    /// mMint token program
    pub m_mint_token_program: Interface<'info, TokenInterface>,
    /// Payment mint token program
    pub payment_mint_token_program: Interface<'info, TokenInterface>,
    /// System program
    pub system_program: Program<'info, System>,
}

impl<'info> Closable for ApproveRedeemRequest<'info> {
    /// Close implementation to close redeem request
    fn close(&mut self) -> Result<()> {
        close_account(&mut self.redeem_request.to_account_info(), &mut self.user_account, &self.system_program)?;

        Ok(())
    }
}

/// Approves redeem request and emits an event.
/// Can be used only for non-fiat redeem requests.
/// Can be called only by vault admin.
/// 
/// # Arguments
/// 
/// - `request_id` - ID of redeem request
/// - `new_m_token_rate` - new mToken rate
/// Using this value admin can correct the output mToken amount.
/// - `is_safe` - if the redeem request is safe
pub fn handle(
    ctx: Context<ApproveRedeemRequest>,
    request_id: u64,
    new_m_token_rate: u64,
    is_safe: bool,
) -> Result<()> {
    redeemer::approve_redeem_request(
        &ctx.accounts.redeem_request, 
        &ctx.accounts.vault_common, 
        &ctx.accounts.redeemer_vault, 
        &ctx.accounts.m_mint_token_program, 
        &ctx.accounts.m_mint, 
        &ctx.accounts.m_mint_vault_ata, 
        &mut ctx.accounts.payment_mint_state, 
        Some(&ctx.accounts.payment_mint),
        Some (&ctx.accounts.payment_mint_token_program), 
        Some(&ctx.accounts.payment_mint_redeemer_ata), 
        Some(&ctx.accounts.payment_mint_user_ata), 
        request_id,
        new_m_token_rate.into(), 
        is_safe
    )?;

    ctx.accounts.close()?;

    Ok(())
}
