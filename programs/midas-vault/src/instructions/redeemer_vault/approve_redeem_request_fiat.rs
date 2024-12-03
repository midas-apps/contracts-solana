use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::{prelude::*, solana_program::address_lookup_table::instruction};
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use data_feed::{program::DataFeed, state::FeedState, utils::decimals_conversion};

use crate::{
    accounts, constants::{ac_roles, seeds, FIAT_MINT, ONE, ONE_HUNDRED_PERCENT}, errors::MidasVaultsError, state::{
        MintAuthorityState, MintVaultRequestState, MinterVaultState, PauseInxState, PaymentMintState, RedeemerVaultRequestState, RedeemerVaultState, VaultCommonAccountState, VaultCommonState
    }, utils::{burn_mtoken, close_account, mint_token, minter::{self}, redeemer, require_and_update_allowance, require_and_update_limit, require_variation_tolerance, transfer_token, truncate, Closable}
};

#[derive(Accounts)]
#[instruction(request_id: u64)]
pub struct ApproveRedeemRequestFiat<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK:
    #[account(
        mut, 
        address = redeem_request.user
    )]
    pub user_account: AccountInfo<'info>,

    #[account(
        mut,
        address = redeemer_vault.common_vault,
    )]
    pub vault_common: Account<'info, VaultCommonState>,

    #[account(
        seeds = [AccountAccessControlRoleState::SEED, vault_common.ac_role.as_ref(), authority.key().as_ref(), ac_roles::VAULT_ADMIN],
        seeds::program = AccessControl::id(),
        bump,
    )]
    pub authority_ac_role: Account<'info, AccountAccessControlRoleState>,

    #[account(
        mut,
        seeds = [RedeemerVaultState::SEED, vault_common.key().as_ref()],
        bump
    )]
    pub redeemer_vault: Account<'info, RedeemerVaultState>,

    #[account(
        mut,
        seeds = [PaymentMintState::SEED, vault_common.key().as_ref(), FIAT_MINT.as_ref()],
        bump
    )]
    pub payment_mint_state: Account<'info, PaymentMintState>,

    #[account(
        mut,
        seeds = [RedeemerVaultRequestState::SEED, redeemer_vault.key().as_ref(), &request_id.to_le_bytes()],
        bump
    )]
    pub redeem_request: Account<'info, RedeemerVaultRequestState>,

    #[account(
        mut,
        associated_token::token_program = m_mint_token_program,
        associated_token::mint = m_mint,
        associated_token::authority = redeemer_vault,
    )]
    pub m_mint_vault_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        mint::token_program = m_mint_token_program,
        address = vault_common.m_mint
    )]
    pub m_mint: Box<InterfaceAccount<'info, Mint>>,

    pub m_mint_token_program: Interface<'info, TokenInterface>,

    pub system_program: Program<'info, System>,
}

impl<'info> Closable for ApproveRedeemRequestFiat<'info> {
    fn close(&mut self) -> Result<()> {
        close_account(&mut self.redeem_request.to_account_info(), &mut self.user_account, &self.system_program)?;

        Ok(())
    }
}

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
        None,
        request_id,
        new_m_token_rate.into(), 
        is_safe
    )?;

    ctx.accounts.close()?;

    Ok(())
}
