use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use data_feed::{program::DataFeed, state::FeedState, utils::decimals_conversion};

use crate::{
    constants::seeds, errors::MidasVaultsError, state::{
        AccessControlState, AccountAccessControlState, MintAuthorityState, MinterVaultState, PauseInxState, PaymentMintState, VaultCommonAccountState, VaultCommonState
    }, utils::{mint_token, minter::{self}, require_and_update_limit, transfer_token, validate_common, Validate}
};

#[derive(Accounts)]
pub struct MintInstant<'info> {
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
        address = minter_vault.mint_authority_pda
    )]
    pub mint_authority: Box<Account<'info, MintAuthorityState>>,

    #[account(
        mut,
        seeds = [MinterVaultState::SEED, vault_common.key().as_ref()],
        bump
    )]
    pub minter_vault: Account<'info, MinterVaultState>,

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
        seeds = [PauseInxState::SEED, vault_common.key().as_ref(), 0u8.to_le_bytes().as_ref()],
        bump
    )]
    pub pause_inx_state: Account<'info, PauseInxState>,

    pub payment_mint_token_program: Interface<'info, TokenInterface>,
    pub m_mint_token_program: Interface<'info, TokenInterface>,

    pub system_program: Program<'info, System>,
}

impl<'info> Validate<'info> for MintInstant<'info> {
    fn validate(&self) -> Result<()> {
        validate_common(&self.vault_common, &self.account_ac, &self.pause_inx_state)?;
        Ok(())
    }
}

pub fn handle(
    ctx: Context<MintInstant>,
    amount_token: u64,
    min_receive_amount: u64,
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
        true
    )?;

    // FIXME: error
    require_gte!(
        params.m_token_amount, min_receive_amount as u128,
        MidasVaultsError::Test
    );

    require_and_update_limit(&mut ctx.accounts.vault_common, params.m_token_amount)?;

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
    
    mint_token(
        &ctx.accounts.mint_authority.base_seed.as_ref(), 
        &ctx.accounts.m_mint_token_program,
        &ctx.accounts.m_mint, 
        &ctx.accounts.mint_authority.to_account_info(), 
        &ctx.accounts.m_mint_signer_ata, 
        params.m_token_amount.try_into().unwrap()
    )?;

    msg!("TRANSFERRED3");


    // TODO: add event
    Ok(())
}
