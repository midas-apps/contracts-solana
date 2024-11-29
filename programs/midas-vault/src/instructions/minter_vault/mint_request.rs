use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use data_feed::{program::DataFeed, state::FeedState, utils::decimals_conversion};

use crate::{
    constants::{seeds, ONE, ONE_HUNDRED_PERCENT}, errors::MidasVaultsError, state::{
        AccessControlState, AccountAccessControlState, MintAuthorityState, MintVaultRequestState, MinterVaultState, PauseInxState, PaymentMintState, VaultCommonAccountState, VaultCommonState
    }, utils::{mint_token, minter::{self}, require_and_update_limit, transfer_token, validate_common, Validate}
};

#[derive(Accounts)]
pub struct MintRequest<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        address = minter_vault.common_vault
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
        seeds = [MinterVaultState::SEED, vault_common.key().as_ref()],
        bump
    )]
    pub minter_vault: Account<'info, MinterVaultState>,

    #[account(
        init,
        payer = signer,
        space = 8 + MintVaultRequestState::INIT_SPACE,
        seeds = [MintVaultRequestState::SEED, minter_vault.key().as_ref(), &vault_common.requests_count.to_le_bytes()],
        bump
    )]
    pub mint_request: Account<'info, MintVaultRequestState>,

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
        associated_token::token_program = payment_mint_token_program,
        associated_token::mint = payment_mint,
        associated_token::authority = vault_common.tokens_receiver,
    )]
    pub payment_mint_tokens_receiver_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::token_program = payment_mint_token_program,
        associated_token::mint = payment_mint,
        associated_token::authority = vault_common.fee_receiver,
    )]
    pub payment_mint_fee_receiver_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::token_program = payment_mint_token_program,
        associated_token::mint = payment_mint,
        associated_token::authority = signer,
    )]
    pub payment_mint_signer_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [PaymentMintState::SEED, vault_common.key().as_ref(), payment_mint.key().as_ref()],
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
        seeds = [PauseInxState::SEED, vault_common.key().as_ref(), 0u8.to_le_bytes().as_ref()],
        bump
    )]
    pub pause_inx_state: Account<'info, PauseInxState>,

    pub payment_mint_token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> Validate<'info> for MintRequest<'info> {
    fn validate(&self) -> Result<()> {
        validate_common(&self.vault_common, &self.account_ac, &self.pause_inx_state)?;
        Ok(())
    }
}

pub fn handle(
    ctx: Context<MintRequest>,
    amount_token: u64,
    referrer_id: [u8; 32],
) -> Result<()> {
    // TODO: use separate mint authority to manage burn and mints

    let amount_token_base9 = decimals_conversion::convert_to_base_9(amount_token.into(), ctx.accounts.payment_mint.decimals).unwrap();

    let params= minter::calc_and_validate_deposit(
        &ctx.accounts.payment_mint,
        &ctx.accounts.payment_mint_data_feed,
        &ctx.accounts.payment_mint_feed,
        &ctx.accounts.m_mint_data_feed,
        &ctx.accounts.m_mint_feed,
        &mut ctx.accounts.payment_mint_state,
        &ctx.accounts.vault_common,
        &mut ctx.accounts.vault_common_signer,
        &mut ctx.accounts.minter_vault,
        amount_token_base9,
        false
    )?;

    transfer_token(
        &ctx.accounts.vault_common.key(), 
        MinterVaultState::SEED,
        &ctx.accounts.payment_mint_token_program,
        &ctx.accounts.payment_mint, 
        &ctx.accounts.signer.to_account_info(), 
        &ctx.accounts.payment_mint_signer_ata, 
        &ctx.accounts.payment_mint_tokens_receiver_ata, 
        params.amount_token_wo_fee
    )?;

    msg!("TRANSFERRED1");

    if params.fee_token_amount > 0 { 
        transfer_token(
            &ctx.accounts.vault_common.key(), 
            MinterVaultState::SEED,
            &ctx.accounts.payment_mint_token_program,
            &ctx.accounts.payment_mint, 
            &ctx.accounts.signer.to_account_info(), 
            &ctx.accounts.payment_mint_signer_ata, 
            &ctx.accounts.payment_mint_fee_receiver_ata, 
            params.fee_token_amount
        )?;
    msg!("TRANSFERRED2");
        
    }
    
    let mint_request = &mut ctx.accounts.mint_request;

    mint_request.user = ctx.accounts.signer.key();
    mint_request.payment_mint = ctx.accounts.payment_mint.key();
    mint_request.deposited_usd = params.mint_amount_in_usd.try_into()?;
    mint_request.deposited_usd_wo_fees = params.amount_token_wo_fee.checked_mul(params.mint_in_rate).unwrap().checked_div(ONE.into()).unwrap().try_into().unwrap();
    mint_request.m_mint_rate = params.m_token_rate.try_into().unwrap();
    


    // TODO: add event
    Ok(())
}
