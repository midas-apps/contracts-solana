use access_control::{
    program::AccessControl,
    state::{AccessControlState, AccountAccessControlRoleState, AccountAccessControlState},
};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use data_feed::{state::FeedState, utils::decimals_conversion};
use token_authority::{
    constants::ac_roles as ac_roles_token_authority, program::TokenAuthority,
    state::TokenAuthorityState,
};

use crate::{
    errors::MidasVaultsError,
    events::MinterVaultInstantMintedEvent,
    state::{
        MinterVaultState, PauseInxState, PaymentMintState, VaultCommonAccountState,
        VaultCommonState,
    },
    utils::{
        mint_token,
        minter::{self},
        require_and_update_limit, transfer_token, validate_common, validate_max_supply_cap,
        Validate, VaultActionId,
    },
};

#[derive(Accounts)]
pub struct MintInstant<'info> {
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
    pub vault_common_signer: Box<Account<'info, VaultCommonAccountState>>,

    /// Token authority state account
    #[account(
        mut,
        address = minter_vault.mint_authority_pda,
        owner = TokenAuthority::id()
    )]
    pub token_authority: Box<Account<'info, TokenAuthorityState>>,

    /// Vault minter role
    #[account(
        seeds = [AccountAccessControlRoleState::SEED, token_authority.ac_role.as_ref(), minter_vault.key().as_ref(), ac_roles_token_authority::M_MINTER],
        seeds::program = AccessControl::id(),
        bump,
    )]
    pub vault_minter_role: Box<Account<'info, AccountAccessControlRoleState>>,

    /// Minter vault state account
    #[account(
        mut,
        seeds = [MinterVaultState::SEED, vault_common.key().as_ref()],
        bump
    )]
    pub minter_vault: Box<Account<'info, MinterVaultState>>,

    /// AccessControlState account
    #[account(
        address = vault_common.ac,
        owner = AccessControl::id()
    )]
    pub ac: Box<Account<'info, AccessControlState>>,

    /// AccountAccessControlState account
    #[account(
        seeds = [AccountAccessControlState::SEED, ac.key().as_ref(), signer.key().as_ref()],
        seeds::program = AccessControl::id(),
        bump,
    )]
    pub account_ac: Box<Account<'info, AccountAccessControlState>>,

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

    /// mMint ATA of `signer`
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

    /// mMint Data Feed account
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

    /// Pause state of instruction
    #[account(
        seeds = [PauseInxState::SEED, vault_common.key().as_ref(), (VaultActionId::MintInstant as u8).to_le_bytes().as_ref()],
        bump
    )]
    pub pause_inx_state: Box<Account<'info, PauseInxState>>,

    /// Payment mint token program
    pub payment_mint_token_program: Interface<'info, TokenInterface>,
    /// mMint token program
    pub m_mint_token_program: Interface<'info, TokenInterface>,
    /// Token authority program
    pub token_authority_program: Program<'info, TokenAuthority>,
    /// System program
    pub system_program: Program<'info, System>,
}

impl<'info> Validate<'info> for MintInstant<'info> {
    /// validate implementation for MintInstant
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

/// Atomically takes payment tokens from the user and mints mTokens in exchange.
/// Emits `MinterVaultInstantMintedEvent` event.
/// # Arguments
///
/// - `amount_token` - amount of payment tokens to mint
/// - `min_receive_amount` - minimum amount of mTokens to receive
/// - `referrer_id` - referrer id (can be anything encoded into 32 bytes array)
pub fn handle(
    ctx: Context<MintInstant>,
    amount_token: u64,
    min_receive_amount: u64,
    referrer_id: [u8; 32],
) -> Result<()> {
    let amount_token_base9 = decimals_conversion::convert_to_base_9(
        amount_token.into(),
        ctx.accounts.payment_mint.decimals,
    )
    .unwrap();

    let params = minter::calc_and_validate_deposit(
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
        true,
    )?;

    require_gte!(
        params.m_token_amount,
        min_receive_amount as u128,
        MidasVaultsError::LessThanMinReceiveAmount
    );

    require_and_update_limit(&mut ctx.accounts.vault_common, params.m_token_amount)?;

    transfer_token(
        &ctx.accounts.payment_mint_token_program,
        &ctx.accounts.payment_mint,
        &ctx.accounts.signer.to_account_info(),
        &ctx.accounts.payment_mint_signer_ata,
        &ctx.accounts.payment_mint_tokens_receiver_ata,
        params.amount_token_wo_fee,
    )?;

    if params.fee_token_amount > 0 {
        transfer_token(
            &ctx.accounts.payment_mint_token_program,
            &ctx.accounts.payment_mint,
            &ctx.accounts.signer.to_account_info(),
            &ctx.accounts.payment_mint_signer_ata,
            &ctx.accounts.payment_mint_fee_receiver_ata,
            params.fee_token_amount,
        )?;
    }

    if !validate_max_supply_cap(
        &ctx.accounts.m_mint,
        &ctx.accounts.minter_vault,
        params.m_token_amount.try_into().unwrap(),
    )? {
        return Err(MidasVaultsError::MaxSupplyCapExceeded.into());
    }

    mint_token(
        &ctx.accounts.vault_common.key(),
        &ctx.accounts.minter_vault.to_account_info(),
        &ctx.accounts.signer.to_account_info(),
        &ctx.accounts.token_authority.to_account_info(),
        &ctx.accounts.vault_minter_role.to_account_info(),
        &ctx.accounts.m_mint.to_account_info(),
        &ctx.accounts.m_mint_signer_ata.to_account_info(),
        &ctx.accounts.m_mint_token_program.to_account_info(),
        &ctx.accounts.system_program.to_account_info(),
        &ctx.accounts.token_authority_program.to_account_info(),
        params.m_token_amount.try_into().unwrap(),
    )?;

    emit!(MinterVaultInstantMintedEvent {
        common_vault: ctx.accounts.vault_common.key(),
        payment_mint: ctx.accounts.payment_mint.key(),
        signer: ctx.accounts.signer.key(),
        payment_amount: amount_token_base9.try_into().unwrap(),
        calculated: params,
        referrer_id
    });
    Ok(())
}
