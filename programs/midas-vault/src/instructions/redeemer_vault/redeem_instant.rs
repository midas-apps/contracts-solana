use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use data_feed::{program::DataFeed, state::FeedState, utils::decimals_conversion};

use crate::{
    constants::seeds, errors::MidasVaultsError, state::{
        AccessControlState, AccountAccessControlState, MintAuthorityState, MinterVaultState, PauseInxState, PaymentMintState, RedeemerVaultState, VaultCommonAccountState, VaultCommonState
    }, utils::{burn_mtoken, mint_token, minter::{self}, redeemer, require_and_update_allowance, require_and_update_limit, transfer_token, truncate, validate_common, Validate}
};

#[derive(Accounts)]
pub struct RedeemInstant<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        address = redeemer_vault.common_vault
    )]
    pub vault_common: Account<'info, VaultCommonState>,

    #[account(
        mut,
        seeds = [VaultCommonAccountState::SEED, vault_common.key().as_ref(), signer.key().as_ref()],
        bump
    )]
    pub vault_common_signer: Account<'info, VaultCommonAccountState>,

    #[account(
        mut,
        seeds = [RedeemerVaultState::SEED, vault_common.key().as_ref()],
        bump
    )]
    pub redeemer_vault: Account<'info, RedeemerVaultState>,

    #[account(
        address = vault_common.ac
    )]
    pub ac: Account<'info, AccessControlState>,

    #[account(
        seeds = [AccountAccessControlState::SEED, ac.key().as_ref(), signer.key().as_ref()],
        bump
    )]
    pub account_ac: Account<'info, AccountAccessControlState>,

    #[account(
        mint::token_program = payment_mint_token_program
    )]
    pub payment_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        associated_token::token_program = m_mint_token_program,
        associated_token::mint = m_mint,
        associated_token::authority = vault_common.fee_receiver,
    )]
    pub m_mint_fee_receiver_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::token_program = payment_mint_token_program,
        associated_token::mint = payment_mint,
        associated_token::authority = redeemer_vault,
    )]
    pub payment_mint_vault_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::token_program = payment_mint_token_program,
        associated_token::mint = payment_mint,
        associated_token::authority = signer,
    )]
    pub payment_mint_signer_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::token_program = m_mint_token_program,
        associated_token::mint = m_mint,
        associated_token::authority = signer,
    )]
    pub m_mint_signer_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [PaymentMintState::SEED, vault_common.key().as_ref(), payment_mint.key().as_ref()],
        bump
    )]
    pub payment_mint_state: Account<'info, PaymentMintState>,

    #[account(
        mut,
        mint::token_program = m_mint_token_program,
        address = vault_common.m_mint
    )]
    pub m_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        address = vault_common.m_mint_feed
    )]
    pub m_mint_data_feed: Account<'info, FeedState>,

    /// CHECK:
    #[account(
        address = m_mint_data_feed.underlying_feed 
    )]
    pub m_mint_feed: AccountInfo<'info>,

    #[account(
        address = payment_mint_state.data_feed
    )]
    pub payment_mint_data_feed: Account<'info, FeedState>,

    /// CHECK:
    #[account(
        address = payment_mint_data_feed.underlying_feed 
    )]
    pub payment_mint_feed: AccountInfo<'info>,

    #[account(
        // FIXME: move to enum
        seeds = [PauseInxState::SEED, vault_common.key().as_ref(), 2u8.to_le_bytes().as_ref()],
        bump
    )]
    pub pause_inx_state: Account<'info, PauseInxState>,

    pub payment_mint_token_program: Interface<'info, TokenInterface>,
    pub m_mint_token_program: Interface<'info, TokenInterface>,

    pub system_program: Program<'info, System>,
}

impl<'info> Validate<'info> for RedeemInstant<'info> {
    fn validate(&self) -> Result<()> {
        validate_common(&self.vault_common, &self.account_ac, &self.pause_inx_state)?;
        Ok(())
    }
}

pub fn handle(
    ctx: Context<RedeemInstant>,
    amount_m_token: u64,
    min_receive_amount: u64
) -> Result<()> {
    let params= redeemer::calc_and_validate_redeem(
        &mut ctx.accounts.payment_mint_state,
        &ctx.accounts.vault_common,
        &mut ctx.accounts.vault_common_signer,
        &mut ctx.accounts.redeemer_vault,
        amount_m_token.into(),
        true,
        false
    )?;


    require_and_update_limit(&mut ctx.accounts.vault_common, amount_m_token.into())?;

    let decimals = ctx.accounts.payment_mint.decimals;


    let (amount_m_token_in_usd, m_token_rate) = redeemer::convert_m_token_to_usd(&ctx.accounts.m_mint_data_feed, &ctx.accounts.m_mint_feed, amount_m_token.into())?;

    let (amount_payment_token,payment_token_rate) = redeemer::convert_usd_to_payment_mint(&ctx.accounts.payment_mint_state, &ctx.accounts.payment_mint_data_feed, &ctx.accounts.payment_mint_feed, amount_m_token_in_usd)?;

    let amount_payment_token_wo_fee = truncate(
        params.m_token_amount_wo_fee.checked_mul(m_token_rate).unwrap().checked_div(payment_token_rate).unwrap()
        , decimals)?;

    // FIXME: error
    require_gte!(
        amount_payment_token_wo_fee, min_receive_amount as u128,
        MidasVaultsError::LessThanMinReceiveAmount
    );

    require_and_update_allowance(&mut ctx.accounts.payment_mint_state, amount_payment_token)?;

    burn_mtoken(&ctx.accounts.vault_common.key(), &ctx.accounts.m_mint_token_program, &ctx.accounts.m_mint, &ctx.accounts.signer, &ctx.accounts.m_mint_signer_ata, params.m_token_amount_wo_fee)?;

    if params.fee_amount > 0 {
        transfer_token(
            &ctx.accounts.vault_common.key(), 
            RedeemerVaultState::SEED,
            &ctx.accounts.m_mint_token_program,
            &ctx.accounts.m_mint, 
            &ctx.accounts.signer.to_account_info(), 
            &ctx.accounts.m_mint_signer_ata, 
            &ctx.accounts.m_mint_fee_receiver_ata, 
            params.fee_amount
        )?;
        msg!("TRANSFERRED1");
    }
    
    transfer_token(
        &ctx.accounts.vault_common.key(), 
        RedeemerVaultState::SEED,
        &ctx.accounts.payment_mint_token_program,
        &ctx.accounts.payment_mint, 
        &ctx.accounts.redeemer_vault.to_account_info(), 
        &ctx.accounts.payment_mint_vault_ata, 
        &ctx.accounts.payment_mint_signer_ata, 
        amount_payment_token_wo_fee
    )?;

    msg!("TRANSFERRED3");

    // TODO: add event
    Ok(())
}
