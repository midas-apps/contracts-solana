use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use data_feed::{program::DataFeed, state::FeedState, utils::decimals_conversion};

use crate::{
    constants::{seeds, ONE, ONE_HUNDRED_PERCENT}, errors::MidasVaultsError, state::{
        AccessControlState, AccountAccessControlState, MintAuthorityState, MintVaultRequestState, MinterVaultState, PauseInxState, PaymentMintState, RedeemerVaultRequestState, RedeemerVaultState, VaultCommonAccountState, VaultCommonState
    }, utils::{mint_token, minter::{self}, require_and_update_limit, require_variation_tolerance, transfer_token}
};

#[derive(Accounts)]
#[instruction(request_id: u64)]
pub struct RejectRedeemRequest<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK:
    #[account(mut, 
        address = redeem_request.user
    )]
    pub user_account: AccountInfo<'info>,

    #[account(
        address = redeemer_vault.common_vault,
        has_one = authority
    )]
    pub vault_common: Account<'info, VaultCommonState>,

    #[account(
        mut,
        seeds = [RedeemerVaultState::SEED, vault_common.key().as_ref()],
        bump
    )]
    pub redeemer_vault: Account<'info, RedeemerVaultState>,

    #[account(
        mut,
        close = user_account,
        seeds = [RedeemerVaultRequestState::SEED, redeemer_vault.key().as_ref(), &request_id.to_le_bytes()],
        bump,
    )]
    pub redeem_request: Account<'info, RedeemerVaultRequestState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(
    _: Context<RejectRedeemRequest>,
    _: u64
) -> Result<()> {
    // TODO: add event
    Ok(())
}
