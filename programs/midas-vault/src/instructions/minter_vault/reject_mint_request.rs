use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use data_feed::{program::DataFeed, state::FeedState, utils::decimals_conversion};

use crate::{
    constants::{ac_roles, seeds, ONE, ONE_HUNDRED_PERCENT}, errors::MidasVaultsError, state::{
          MintVaultRequestState, MinterVaultState, PauseInxState, PaymentMintState, VaultCommonAccountState, VaultCommonState
    }, utils::{mint_token, minter::{self}, require_and_update_limit, require_variation_tolerance, transfer_token}
};

#[derive(Accounts)]
#[instruction(request_id: u64)]
pub struct RejectMintRequest<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK:
    #[account(mut, 
        address = mint_request.user
    )]
    pub user_account: AccountInfo<'info>,

    #[account()]
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
        close = user_account,
        seeds = [MintVaultRequestState::SEED, minter_vault.key().as_ref(), &request_id.to_le_bytes()],
        bump,
    )]
    pub mint_request: Account<'info, MintVaultRequestState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(
    _: Context<RejectMintRequest>,
    _: u64
) -> Result<()> {
    // TODO: add event
    Ok(())
}
