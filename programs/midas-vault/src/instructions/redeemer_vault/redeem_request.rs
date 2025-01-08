use access_control::{program::AccessControl, state::{AccessControlState, AccountAccessControlState}};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use data_feed::state::FeedState;

use crate::{
    state::{
          PauseInxState, PaymentMintState, RedeemerVaultRequestState, RedeemerVaultState, VaultCommonAccountState, VaultCommonState
    }, utils::{redeemer, validate_common, Validate, VaultActionId}
};

#[derive(Accounts)]
pub struct RedeemRequest<'info> {
    /// User account
    #[account(mut)]
    pub signer: Signer<'info>,

    /// Redeemer vault state account
    #[account(
        mut,
        seeds = [RedeemerVaultState::SEED, vault_common.key().as_ref()],
        bump
    )]
    pub redeemer_vault: Account<'info, RedeemerVaultState>,

    /// Vault common state account
    #[account(
        mut,
        address = redeemer_vault.common_vault
    )]
    pub vault_common: Box<Account<'info, VaultCommonState>>,

    /// Vault common account of user
    #[account(
        mut,
        seeds = [VaultCommonAccountState::SEED, vault_common.key().as_ref(), signer.key().as_ref()],
        bump
    )]
    pub vault_common_signer: Account<'info, VaultCommonAccountState>,

    /// Redeem request state account
    #[account(
        init,
        payer = signer,
        space = 8 + RedeemerVaultRequestState::INIT_SPACE,
        seeds = [RedeemerVaultRequestState::SEED, redeemer_vault.key().as_ref(), &vault_common.requests_count.to_le_bytes()],
        bump
    )]
    pub redeem_request: Account<'info, RedeemerVaultRequestState>,

    /// AccessControlState account
    #[account(
        address = vault_common.ac,
        owner = AccessControl::id(),
    )]
    pub ac: Account<'info, AccessControlState>,

    /// Account access control state account
    #[account(
        seeds = [AccountAccessControlState::SEED, ac.key().as_ref(), signer.key().as_ref()],
        seeds::program = AccessControl::id(),
        bump
    )]
    pub account_ac: Account<'info, AccountAccessControlState>,

    /// Payment mint account
    #[account(
        mint::token_program = payment_mint_token_program
    )]
    pub payment_mint: Box<InterfaceAccount<'info, Mint>>,

    /// mMint vault ATA
    #[account(
        mut,
        associated_token::token_program = m_mint_token_program,
        associated_token::mint = m_mint,
        associated_token::authority = redeemer_vault,
    )]
    pub m_mint_vault_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    /// mMint fee receiver ATA
    #[account(
        mut,
        associated_token::token_program = m_mint_token_program,
        associated_token::mint = m_mint,
        associated_token::authority = vault_common.fee_receiver,
    )]
    pub m_mint_fee_receiver_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    /// mMint signer ATA
    #[account(
        mut,
        associated_token::token_program = m_mint_token_program,
        associated_token::mint = m_mint,
        associated_token::authority = signer,
    )]
    pub m_mint_signer_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    /// mMint SPL account
    #[account(
        mut,
        mint::token_program = m_mint_token_program,
        address = vault_common.m_mint
    )]
    pub m_mint: Box<InterfaceAccount<'info, Mint>>,

    /// Payment mint state account
    #[account(
        mut,
        seeds = [PaymentMintState::SEED, vault_common.key().as_ref(), payment_mint.key().as_ref()],
        bump
    )]
    pub payment_mint_state: Account<'info, PaymentMintState>,

    /// mMint data feed state account
    #[account(
        address = vault_common.m_mint_feed
    )]
    pub m_mint_data_feed: Account<'info, FeedState>,

    /// CHECK:
    /// mMint underlying feed state account
    #[account(
        address = m_mint_data_feed.underlying_feed 
    )]
    pub m_mint_feed: AccountInfo<'info>,

    /// Payment mint data feed state account
    #[account(
        address = payment_mint_state.data_feed
    )]
    pub payment_mint_data_feed: Account<'info, FeedState>,

    /// CHECK:
    /// Payment mint underlying feed state account
    #[account(
        address = payment_mint_data_feed.underlying_feed 
    )]
    pub payment_mint_feed: AccountInfo<'info>,

    /// Instruction pause state account
    #[account(
        seeds = [PauseInxState::SEED, vault_common.key().as_ref(), (VaultActionId::RedeemRequest as u8).to_le_bytes().as_ref()],
        bump
    )]
    pub pause_inx_state: Account<'info, PauseInxState>,

    /// mMint token program
    pub m_mint_token_program: Interface<'info, TokenInterface>,
    /// Payment mint token program
    pub payment_mint_token_program: Interface<'info, TokenInterface>,
    /// System program
    pub system_program: Program<'info, System>,
}

impl<'info> Validate<'info> for RedeemRequest<'info> {
    /// validates implementation for MintRequest
    fn validate(&self) -> Result<()> {
        validate_common(&self.vault_common, &self.account_ac, &self.pause_inx_state, false)?;
        Ok(())
    }
}

/// Takes mToken from user and creates a redeem request.
/// Vault admin reviews the request and decides whether to approve it or reject it.
/// Payment tokens are sent to the user's account if the request is approved.
/// 
/// # Arguments
/// 
/// - `amount_m_token` - amount of mToken to redeem 
pub fn handle(
    ctx: Context<RedeemRequest>,
    amount_m_token: u64,
) -> Result<()> {

    redeemer::create_redeem_request(
        &ctx.accounts.signer,
        &mut ctx.accounts.vault_common,
        &mut ctx.accounts.vault_common_signer,
        &mut ctx.accounts.redeemer_vault,
        &mut ctx.accounts.payment_mint_state,
        &ctx.accounts.payment_mint.key(),
        Some(& ctx.accounts.payment_mint_data_feed),
        Some(&ctx.accounts.payment_mint_feed),
        &ctx.accounts.m_mint,
        &ctx.accounts.m_mint_token_program,
        &ctx.accounts.m_mint_data_feed,
        &ctx.accounts.m_mint_feed,
        &ctx.accounts.m_mint_signer_ata,
        &ctx.accounts.m_mint_vault_ata,
        &ctx.accounts.m_mint_fee_receiver_ata,
        &mut ctx.accounts.redeem_request,
        amount_m_token.into(),
        false
    )?;

    Ok(())
}
