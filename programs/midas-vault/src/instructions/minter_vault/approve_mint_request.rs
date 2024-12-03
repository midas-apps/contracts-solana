use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::{prelude::*, solana_program::address_lookup_table::instruction};
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use data_feed::{program::DataFeed, state::FeedState, utils::decimals_conversion};

use crate::{
    constants::{ac_roles, seeds, ONE, ONE_HUNDRED_PERCENT}, errors::MidasVaultsError, state::{
        MintAuthorityState, MintVaultRequestState, MinterVaultState, PauseInxState, PaymentMintState, VaultCommonAccountState, VaultCommonState
    }, utils::{close_account, mint_token, minter::{self}, require_and_update_limit, require_variation_tolerance, transfer_token, Closable}
};

#[derive(Accounts)]
#[instruction(request_id: u64)]
pub struct ApproveMintRequest<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK:
    #[account(
        mut, 
        address = mint_request.user
    )]
    pub user_account: AccountInfo<'info>,

    #[account(
        address = minter_vault.common_vault,
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
        seeds = [MinterVaultState::SEED, vault_common.key().as_ref()],
        bump
    )]
    pub minter_vault: Account<'info, MinterVaultState>,

    #[account(
        mut,
        seeds = [MintVaultRequestState::SEED, minter_vault.key().as_ref(), &request_id.to_le_bytes()],
        bump
    )]
    pub mint_request: Account<'info, MintVaultRequestState>,

    #[account(
        mut,
        address = minter_vault.mint_authority_pda
    )]
    pub mint_authority: Box<Account<'info, MintAuthorityState>>,

    #[account(
        seeds = [AccountAccessControlRoleState::SEED, mint_authority.ac_role.as_ref(), minter_vault.key().as_ref(), ac_roles::M_MINTER],
        seeds::program = AccessControl::id(),
        bump,
    )]
    pub vault_minter_role: Account<'info, AccountAccessControlRoleState>,

    #[account(
        mut,
        associated_token::token_program = m_mint_token_program,
        associated_token::mint = m_mint,
        associated_token::authority = user_account,
    )]
    pub m_mint_user_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        mint::token_program = m_mint_token_program,
        address = vault_common.m_mint
    )]
    pub m_mint: Box<InterfaceAccount<'info, Mint>>,

    pub m_mint_token_program: Interface<'info, TokenInterface>,

    pub system_program: Program<'info, System>,
}

impl<'info> Closable for ApproveMintRequest<'info> {
    fn close(&mut self) -> Result<()> {

        close_account(&mut self.mint_request.to_account_info(), &mut self.user_account, &self.system_program)?;

        Ok(())
    }
}

pub fn handle(
    ctx: Context<ApproveMintRequest>,
    request_id: u64,
    new_out_rate: u64,
    is_safe: bool,
) -> Result<()> {
    // TODO: create a new fn to handle is_safe case

    let request = &ctx.accounts.mint_request;

    if is_safe {
        require_variation_tolerance(&ctx.accounts.vault_common, request.m_mint_rate.into(), new_out_rate.into())?;
    }

    let amount_to_mint =(request.deposited_usd_wo_fees as u128).checked_mul(ONE.into()).unwrap().checked_div(new_out_rate.into()).unwrap();

    mint_token(
        &ctx.accounts.mint_authority.base_seed.as_ref(), 
        &ctx.accounts.m_mint_token_program,
        &ctx.accounts.m_mint, 
        &ctx.accounts.mint_authority.to_account_info(), 
        &ctx.accounts.m_mint_user_ata, 
        amount_to_mint.try_into().unwrap()
    )?;

    ctx.accounts.close()?;

    // TODO: add event
    Ok(())
}
