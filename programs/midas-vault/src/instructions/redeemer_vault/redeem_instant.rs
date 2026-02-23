use access_control::{
    program::AccessControl,
    state::{AccessControlState, AccountAccessControlState},
};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use data_feed::state::FeedState;

use crate::{
    errors::MidasVaultsError,
    events::RedeemerVaultInstantRedeemedEvent,
    state::{
        PauseInxState, PaymentMintState, RedeemerVaultState, VaultCommonAccountState,
        VaultCommonState,
    },
    utils::{
        burn_mtoken, redeemer, require_and_update_allowance, require_and_update_limit,
        transfer_token, transfer_token_with_signer, truncate, validate_common, Validate,
        VaultActionId,
    },
};

#[derive(Accounts)]
pub struct RedeemInstant<'info> {
    /// user account
    #[account(mut)]
    pub signer: Signer<'info>,

    /// Vault common state account
    #[account(
        mut,
        address = redeemer_vault.common_vault
    )]
    pub vault_common: Box<Account<'info, VaultCommonState>>,

    /// user vault common account
    #[account(
        mut,
        seeds = [VaultCommonAccountState::SEED, vault_common.key().as_ref(), signer.key().as_ref()],
        bump
    )]
    pub vault_common_signer: Box<Account<'info, VaultCommonAccountState>>,

    /// Redeemer vault state account
    #[account(
        mut,
        seeds = [RedeemerVaultState::SEED, vault_common.key().as_ref()],
        bump
    )]
    pub redeemer_vault: Box<Account<'info, RedeemerVaultState>>,

    /// AccessControlState account
    #[account(
        address = vault_common.ac,
        owner = AccessControl::id(),
    )]
    pub ac: Box<Account<'info, AccessControlState>>,

    /// Account access control state account
    #[account(
        seeds = [AccountAccessControlState::SEED, ac.key().as_ref(), signer.key().as_ref()],
        seeds::program = AccessControl::id(),
        bump
    )]
    pub account_ac: Box<Account<'info, AccountAccessControlState>>,

    /// Payment mint state account
    #[account(
        mint::token_program = payment_mint_token_program
    )]
    pub payment_mint: Box<InterfaceAccount<'info, Mint>>,

    /// mMint fee receiver ATA
    #[account(
        mut,
        associated_token::token_program = m_mint_token_program,
        associated_token::mint = m_mint,
        associated_token::authority = vault_common.fee_receiver,
    )]
    pub m_mint_fee_receiver_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    /// Payment mint vault ATA
    #[account(
        mut,
        associated_token::token_program = payment_mint_token_program,
        associated_token::mint = payment_mint,
        associated_token::authority = redeemer_vault,
    )]
    pub payment_mint_vault_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    /// Payment mint signer ATA
    #[account(
        mut,
        associated_token::token_program = payment_mint_token_program,
        associated_token::mint = payment_mint,
        associated_token::authority = signer,
    )]
    pub payment_mint_signer_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    /// mMint signer ATA
    #[account(
        mut,
        associated_token::token_program = m_mint_token_program,
        associated_token::mint = m_mint,
        associated_token::authority = signer,
    )]
    pub m_mint_signer_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    /// Payment mint state account
    #[account(
        mut,
        seeds = [PaymentMintState::SEED, vault_common.key().as_ref(), payment_mint.key().as_ref()],
        bump
    )]
    pub payment_mint_state: Box<Account<'info, PaymentMintState>>,

    /// mMint account
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
    pub m_mint_data_feed: Box<Account<'info, FeedState>>,

    /// CHECK:
    /// mMint underlying feed account
    #[account(
        address = m_mint_data_feed.underlying_feed
    )]
    pub m_mint_feed: AccountInfo<'info>,

    /// Payment Mint Data Feed account
    #[account(
        address = payment_mint_state.data_feed
    )]
    pub payment_mint_data_feed: Box<Account<'info, FeedState>>,

    /// CHECK:
    /// payment mint underlying feed account
    #[account(
        address = payment_mint_data_feed.underlying_feed
    )]
    pub payment_mint_feed: AccountInfo<'info>,

    /// Instruction pause state
    #[account(
        seeds = [PauseInxState::SEED, vault_common.key().as_ref(), (VaultActionId::RedeemInstant as u8).to_le_bytes().as_ref()],
        bump
    )]
    pub pause_inx_state: Box<Account<'info, PauseInxState>>,

    /// payment mint token program
    pub payment_mint_token_program: Interface<'info, TokenInterface>,
    /// mMint token program
    pub m_mint_token_program: Interface<'info, TokenInterface>,
    /// system program
    pub system_program: Program<'info, System>,
}

impl<'info> Validate<'info> for RedeemInstant<'info> {
    /// Validate implementation for redeem instant instruction
    fn validate(&self) -> Result<()> {
        validate_common(
            &self.vault_common,
            &self.account_ac,
            &self.pause_inx_state,
            false,
        )?;
        Ok(())
    }
}

/// Atomically burns mTokens from user and transfer payment tokens
/// in exchange. Emits `RedeemerVaultInstantRedeemedEvent` event.
///
/// # Arguments
///
/// - `amount_m_token` - Amount of mToken to redeem.
/// - `min_receive_amount` - Minimum amount of payment tokens to receive.
pub fn handle(
    ctx: Context<RedeemInstant>,
    amount_m_token: u64,
    min_receive_amount: u64,
) -> Result<()> {
    let params = redeemer::calc_and_validate_redeem(
        &mut ctx.accounts.payment_mint_state,
        &ctx.accounts.vault_common,
        &mut ctx.accounts.vault_common_signer,
        &mut ctx.accounts.redeemer_vault,
        amount_m_token.into(),
        true,
        false,
    )?;

    require_and_update_limit(&mut ctx.accounts.vault_common, amount_m_token.into())?;

    let decimals = ctx.accounts.payment_mint.decimals;

    let (amount_m_token_in_usd, m_token_rate) = redeemer::convert_m_token_to_usd(
        &ctx.accounts.m_mint_data_feed,
        &ctx.accounts.m_mint_feed,
        amount_m_token.into(),
    )?;

    let (amount_payment_token, payment_token_rate) = redeemer::convert_usd_to_payment_mint(
        &ctx.accounts.payment_mint_state,
        &ctx.accounts.payment_mint_data_feed,
        &ctx.accounts.payment_mint_feed,
        amount_m_token_in_usd,
    )?;

    let amount_payment_token_wo_fee = truncate(
        params
            .m_token_amount_wo_fee
            .checked_mul(m_token_rate)
            .ok_or(MidasVaultsError::ArithmeticOverflow)?
            .checked_div(payment_token_rate)
            .ok_or(MidasVaultsError::ArithmeticOverflow)?,
        decimals,
    )?;

    require_gte!(
        amount_payment_token_wo_fee,
        min_receive_amount as u128,
        MidasVaultsError::LessThanMinReceiveAmount
    );

    require_and_update_allowance(&mut ctx.accounts.payment_mint_state, amount_payment_token)?;

    burn_mtoken(
        &ctx.accounts.m_mint_token_program,
        &ctx.accounts.m_mint,
        &ctx.accounts.signer,
        &ctx.accounts.m_mint_signer_ata,
        params.m_token_amount_wo_fee,
    )?;

    if params.fee_amount > 0 {
        transfer_token(
            &ctx.accounts.m_mint_token_program,
            &ctx.accounts.m_mint,
            &ctx.accounts.signer.to_account_info(),
            &ctx.accounts.m_mint_signer_ata,
            &ctx.accounts.m_mint_fee_receiver_ata,
            params.fee_amount,
        )?;
    }

    transfer_token_with_signer(
        &ctx.accounts.vault_common.key(),
        RedeemerVaultState::SEED,
        &ctx.accounts.payment_mint_token_program,
        &ctx.accounts.payment_mint,
        &ctx.accounts.redeemer_vault.to_account_info(),
        &ctx.accounts.payment_mint_vault_ata,
        &ctx.accounts.payment_mint_signer_ata,
        amount_payment_token_wo_fee,
    )?;

    emit!(RedeemerVaultInstantRedeemedEvent {
        common_vault: ctx.accounts.vault_common.key(),
        payment_mint: ctx.accounts.payment_mint.key(),
        signer: ctx.accounts.signer.key(),
        fee_amount: params.fee_amount,
        m_token_amount_wo_fee: params.m_token_amount_wo_fee,
        amount_m_token,
        amount_m_token_in_usd,
        m_token_rate,
        amount_payment_token,
        payment_token_rate,
        amount_payment_token_wo_fee,
        decimals,
    });

    Ok(())
}
