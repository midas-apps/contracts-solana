use access_control::{program::AccessControl, state::{AccessControlState, AccountAccessControlState}};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use data_feed::{state::FeedState, utils::decimals_conversion};

use crate::{
    events::MinterVaultRequestCreatedEvent, state::{
          MintVaultRequestState, MinterVaultState, PauseInxState, PaymentMintState, VaultCommonAccountState, VaultCommonState
    }, utils::{minter::{self}, transfer_token_with_signer, validate_common, Validate, VaultActionId}
};

#[derive(Accounts)]
pub struct MintRequest<'info> {
    /// User account
    #[account(mut)]
    pub signer: Signer<'info>,

    /// Vault common state account
    #[account(
        mut,
        address = minter_vault.common_vault
    )]
    pub vault_common: Box<Account<'info, VaultCommonState>>,

    /// Vault common account of user
    #[account(
        mut,
        seeds = [VaultCommonAccountState::SEED, vault_common.key().as_ref(), signer.key().as_ref()],
        bump
    )]
    pub vault_common_signer: Account<'info, VaultCommonAccountState>,

    /// Minter vault state account
    #[account(
        mut,
        seeds = [MinterVaultState::SEED, vault_common.key().as_ref()],
        bump
    )]
    pub minter_vault: Account<'info, MinterVaultState>,

    /// Mint request state account
    #[account(
        init,
        payer = signer,
        space = 8 + MintVaultRequestState::INIT_SPACE,
        seeds = [MintVaultRequestState::SEED, minter_vault.key().as_ref(), &vault_common.requests_count.to_le_bytes()],
        bump
    )]
    pub mint_request: Account<'info, MintVaultRequestState>,

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
        bump,
    )]
    pub account_ac: Account<'info, AccountAccessControlState>,

    /// Payment mint account
    #[account(
        mint::token_program = payment_mint_token_program
    )]
    pub payment_mint: Box<InterfaceAccount<'info, Mint>>,

    /// Payment mint ATA of `tokens_receiver`
    #[account(
        mut,
        associated_token::token_program = payment_mint_token_program,
        associated_token::mint = payment_mint,
        associated_token::authority = vault_common.tokens_receiver,
    )]
    pub payment_mint_tokens_receiver_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    /// Payment mint ATA of `fee_receiver`
    #[account(
        mut,
        associated_token::token_program = payment_mint_token_program,
        associated_token::mint = payment_mint,
        associated_token::authority = vault_common.fee_receiver,
    )]
    pub payment_mint_fee_receiver_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    /// Payment mint ATA of `signer`
    #[account(
        mut,
        associated_token::token_program = payment_mint_token_program,
        associated_token::mint = payment_mint,
        associated_token::authority = signer,
    )]
    pub payment_mint_signer_ata: Box<InterfaceAccount<'info, TokenAccount>>,

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
    /// mMint underlying feed account
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
    /// Payment mint underlying feed account
    #[account(
        address = payment_mint_data_feed.underlying_feed 
    )]
    pub payment_mint_feed: AccountInfo<'info>,

    /// Instruction pause state account
    #[account(
        seeds = [PauseInxState::SEED, vault_common.key().as_ref(), (VaultActionId::MintRequest as u8).to_le_bytes().as_ref()],
        bump
    )]
    pub pause_inx_state: Account<'info, PauseInxState>,

    /// payment mint token program
    pub payment_mint_token_program: Interface<'info, TokenInterface>,
    /// system program
    pub system_program: Program<'info, System>,
}

impl<'info> Validate<'info> for MintRequest<'info> {
    /// validates implementation for MintRequest
    fn validate(&self) -> Result<()> {
        validate_common(&self.vault_common, &self.account_ac, &self.pause_inx_state, false)?;
        Ok(())
    }
}

/// Takes payment token from user and creates a mint request.
/// Vault admin reviews the request and decides whether to approve it or reject it.
/// mTokens are minting during the approval process.
/// 
/// # Arguments
/// 
/// - `amount_token` - amount of payment token
/// - `referrer_id` - referrer id (can be anything encoded as 32 bytes array)
pub fn handle(
    ctx: Context<MintRequest>,
    amount_token: u64,
    referrer_id: [u8; 32],
) -> Result<()> {
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

    transfer_token_with_signer(
        &ctx.accounts.vault_common.key(), 
        MinterVaultState::SEED,
        &ctx.accounts.payment_mint_token_program,
        &ctx.accounts.payment_mint, 
        &ctx.accounts.signer.to_account_info(), 
        &ctx.accounts.payment_mint_signer_ata, 
        &ctx.accounts.payment_mint_tokens_receiver_ata, 
        params.amount_token_wo_fee
    )?;

    if params.fee_token_amount > 0 { 
        transfer_token_with_signer(
            &ctx.accounts.vault_common.key(), 
            MinterVaultState::SEED,
            &ctx.accounts.payment_mint_token_program,
            &ctx.accounts.payment_mint, 
            &ctx.accounts.signer.to_account_info(), 
            &ctx.accounts.payment_mint_signer_ata, 
            &ctx.accounts.payment_mint_fee_receiver_ata, 
            params.fee_token_amount
        )?;
    }
    
    let mint_request = &mut ctx.accounts.mint_request;

    mint_request.user = ctx.accounts.signer.key();
    mint_request.payment_mint = ctx.accounts.payment_mint.key();
    mint_request.deposited_usd = params.mint_amount_in_usd.try_into()?;
    mint_request.deposited_usd_wo_fees = params.deposited_usd.try_into()?;
    mint_request.m_mint_rate = params.m_token_rate.try_into().unwrap();
    

    let request_id= ctx.accounts.vault_common.requests_count;

    ctx.accounts.vault_common.requests_count= ctx.accounts.vault_common.requests_count.checked_add(1).unwrap();

    emit!(MinterVaultRequestCreatedEvent {
        common_vault: ctx.accounts.vault_common.key(),
        payment_mint: ctx.accounts.payment_mint.key(),
        signer: ctx.accounts.signer.key(),
        payment_amount: amount_token_base9.try_into().unwrap(),
        calculated: params,
        referrer_id,
        request_id
    });

    Ok(()) 
}
