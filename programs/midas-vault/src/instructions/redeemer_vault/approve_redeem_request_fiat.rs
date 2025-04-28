use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};

use crate::{
    constants::{ac_roles, FIAT_MINT},
    state::{PaymentMintState, RedeemerVaultRequestState, RedeemerVaultState, VaultCommonState},
    utils::{close_account, redeemer, Closable},
};

#[derive(Accounts)]
#[instruction(request_id: u64)]
pub struct ApproveRedeemRequestFiat<'info> {
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

    /// Vault common state account
    #[account(mut)]
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
        seeds = [PaymentMintState::SEED, vault_common.key().as_ref(), FIAT_MINT.as_ref()],
        bump
    )]
    pub payment_mint_state: Account<'info, PaymentMintState>,

    /// Redeem request state account
    #[account(
        mut,
        seeds = [RedeemerVaultRequestState::SEED, redeemer_vault.key().as_ref(), &request_id.to_le_bytes()],
        bump
    )]
    pub redeem_request: Account<'info, RedeemerVaultRequestState>,

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

    /// mMint SPL token program
    pub m_mint_token_program: Interface<'info, TokenInterface>,
    /// System program
    pub system_program: Program<'info, System>,
}

impl<'info> Closable for ApproveRedeemRequestFiat<'info> {
    /// Close implementation to close redeem request
    fn close(&mut self) -> Result<()> {
        close_account(
            &mut self.redeem_request.to_account_info(),
            &mut self.user_account,
            &self.system_program,
        )?;

        Ok(())
    }
}

/// Approves fiat redeem request and emits event.
/// Reason fiat was moved to a different instruction is because
/// it requires a different list of accounts.
/// Can be called only by vault admin.
///
/// # Arguments
///
/// - `request_id` - id of the request to approve
/// - `new_m_token_rate` - new rate of mToken.
/// Using this value admin can correct the output mToken amount.
/// - `is_safe` - if the redeem request is safe
pub fn handle(
    ctx: Context<ApproveRedeemRequestFiat>,
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
        None,
        None,
        None,
        None,
        request_id,
        new_m_token_rate.into(),
        is_safe,
    )?;

    ctx.accounts.close()?;

    Ok(())
}
