use access_control::{program::AccessControl, state::{AccessControlState, AccountAccessControlState}};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use data_feed::{program::DataFeed, state::FeedState, utils::decimals_conversion};

use crate::{
    constants::{seeds, FIAT_MINT, ONE, ONE_HUNDRED_PERCENT}, errors::MidasVaultsError, state::{
         MintVaultRequestState, MinterVaultState, PauseInxState, PaymentMintState, RedeemerVaultRequestState, RedeemerVaultState, VaultCommonAccountState, VaultCommonState
    }, utils::{get_token_rate, mint_token, minter::{self}, redeemer, require_and_update_limit, transfer_token, validate_common, Validate, VaultActionId}
};

#[derive(Accounts)]
pub struct RedeemRequestFiat<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        mut,
        seeds = [RedeemerVaultState::SEED, vault_common.key().as_ref()],
        bump
    )]
    pub redeemer_vault: Account<'info, RedeemerVaultState>,

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
        init,
        payer = signer,
        space = 8 + RedeemerVaultRequestState::INIT_SPACE,
        seeds = [RedeemerVaultRequestState::SEED, redeemer_vault.key().as_ref(), &vault_common.requests_count.to_le_bytes()],
        bump
    )]
    pub redeem_request: Account<'info, RedeemerVaultRequestState>,

    #[account(
        address = vault_common.ac,
        owner = AccessControl::id(),
    )]
    pub ac: Account<'info, AccessControlState>,

    #[account(
        seeds = [AccountAccessControlState::SEED, ac.key().as_ref(), signer.key().as_ref()],
        seeds::program = AccessControl::id(),
        bump
    )]
    pub account_ac: Account<'info, AccountAccessControlState>,

    #[account(
        mut,
        associated_token::token_program = m_mint_token_program,
        associated_token::mint = m_mint,
        associated_token::authority = redeemer_vault,
    )]
    pub m_mint_vault_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::token_program = m_mint_token_program,
        associated_token::mint = m_mint,
        associated_token::authority = vault_common.fee_receiver,
    )]
    pub m_mint_fee_receiver_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::token_program = m_mint_token_program,
        associated_token::mint = m_mint,
        associated_token::authority = signer,
    )]
    pub m_mint_signer_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        mint::token_program = m_mint_token_program,
        address = vault_common.m_mint
    )]
    pub m_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        seeds = [PaymentMintState::SEED, vault_common.key().as_ref(), FIAT_MINT.as_ref()],
        bump
    )]
    pub payment_mint_state: Account<'info, PaymentMintState>,

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
        seeds = [PauseInxState::SEED, vault_common.key().as_ref(), (VaultActionId::RedeemRequestFiat as u8).to_le_bytes().as_ref()],
        bump
    )]
    pub pause_inx_state: Account<'info, PauseInxState>,

    pub m_mint_token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> Validate<'info> for RedeemRequestFiat<'info> {
    fn validate(&self) -> Result<()> {
        validate_common(&self.vault_common, &self.account_ac, &self.pause_inx_state, true)?;
        Ok(())
    }
}

pub fn handle(
    ctx: Context<RedeemRequestFiat>,
    amount_m_token: u64,
) -> Result<()> {

    redeemer::create_redeem_request(
        &ctx.accounts.signer,
        &mut ctx.accounts.vault_common,
        &mut ctx.accounts.vault_common_signer,
        &mut ctx.accounts.redeemer_vault,
        &mut ctx.accounts.payment_mint_state,
        &FIAT_MINT,
        None,
        None,
        &ctx.accounts.m_mint,
        &ctx.accounts.m_mint_token_program,
        &ctx.accounts.m_mint_data_feed,
        &ctx.accounts.m_mint_feed,
        &ctx.accounts.m_mint_signer_ata,
        &ctx.accounts.m_mint_vault_ata,
        &ctx.accounts.m_mint_fee_receiver_ata,
        &mut ctx.accounts.redeem_request,
        amount_m_token.into(),
    )?;

    // TODO: add event
    Ok(())
}
