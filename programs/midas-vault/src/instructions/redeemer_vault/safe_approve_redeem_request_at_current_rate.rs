use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use data_feed::state::FeedState;

use crate::{
    constants::ac_roles,
    state::{PaymentMintState, RedeemerVaultRequestState, RedeemerVaultState, VaultCommonState},
    utils::{close_account, get_token_rate, redeemer, Closable},
};

#[derive(Accounts)]
#[instruction(request_id: u64)]
pub struct SafeApproveRedeemRequestAtCurrentRate<'info> {
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

    /// mMint data feed state account
    #[account(
        address = vault_common.m_mint_feed
    )]
    pub m_mint_data_feed: Account<'info, FeedState>,

    /// CHECK:
    /// mMint underlying feed account
    #[account(
        address = m_mint_data_feed.underlying_feed
    )]
    pub m_mint_feed: AccountInfo<'info>,

    /// mMint token program
    pub m_mint_token_program: Interface<'info, TokenInterface>,
    /// Payment mint token program
    pub payment_mint_token_program: Interface<'info, TokenInterface>,
    /// System program
    pub system_program: Program<'info, System>,
}

impl<'info> Closable for SafeApproveRedeemRequestAtCurrentRate<'info> {
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

/// Safely approves redeem request at the current mToken rate from data feed.
/// Validates variation tolerance between request rate and current rate.
/// Will close redeem request account after processing.
/// Can only be called by the vault admin.
///
/// # Arguments
///
/// - `request_id` - id of the redeem request
/// - `safe_validate_liquidity` - if true, checks redeemer liquidity before transfer
/// and skips processing (returns success) if insufficient
pub fn handle(
    ctx: Context<SafeApproveRedeemRequestAtCurrentRate>,
    request_id: u64,
    safe_validate_liquidity: bool,
) -> Result<()> {
    let current_rate = get_token_rate(
        &ctx.accounts.m_mint_data_feed,
        &ctx.accounts.m_mint_feed,
        false,
    )?;
    let new_m_token_rate: u64 = current_rate.try_into().unwrap();

    match redeemer::approve_redeem_request(
        &ctx.accounts.redeem_request,
        &ctx.accounts.vault_common,
        &ctx.accounts.redeemer_vault,
        &ctx.accounts.m_mint_token_program,
        &ctx.accounts.m_mint,
        &ctx.accounts.m_mint_vault_ata,
        &mut ctx.accounts.payment_mint_state,
        Some(&ctx.accounts.payment_mint),
        Some(&ctx.accounts.payment_mint_token_program),
        Some(&ctx.accounts.payment_mint_redeemer_ata),
        Some(&ctx.accounts.payment_mint_user_ata),
        request_id,
        new_m_token_rate.into(),
        true,
        safe_validate_liquidity,
    ) {
        Ok(true) => {
            ctx.accounts.close()?;
            Ok(())
        }
        Ok(false) => Ok(()),
        Err(e) => Err(e),
    }
}
