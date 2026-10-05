use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;

use crate::{
    constants::ac_roles,
    state::{RedeemerVaultState, VaultCommonState},
    utils::redeemer,
};

#[derive(Accounts)]
pub struct NewRedeemerVault<'info> {
    /// Account with vault admin role
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Vault common state account
    #[account()]
    pub vault_common: Account<'info, VaultCommonState>,

    /// Admin role of authority
    #[account(
        seeds = [AccountAccessControlRoleState::SEED, vault_common.ac_role.as_ref(), authority.key().as_ref(), ac_roles::VAULT_ADMIN],
        seeds::program = AccessControl::id(),
        bump,
    )]
    pub authority_ac_role: Account<'info, AccountAccessControlRoleState>,

    /// Redeemer vault state account
    #[account(
        init,
        payer = authority,
        space = 8 + RedeemerVaultState::INIT_SPACE,
        seeds = [RedeemerVaultState::SEED, vault_common.key().as_ref()],
        bump

    )]
    pub redeemer_vault: Account<'info, RedeemerVaultState>,

    /// System program
    pub system_program: Program<'info, System>,
}

/// Initializes redeemer vault account.
/// Can only be called by the vault admin.
///
/// # Arguments
///
/// - `request_redeemer` - account from which tokens will be taken during
///   the request approval (not ATA)
/// - `min_fiat_redeem_amount` - minimum amount of mTokens to initiate
///   a fiat redeem request
/// - `fiat_flat_fee` - flat mToken fee (not it %) for fiat redeem request
pub fn handle(
    ctx: Context<NewRedeemerVault>,
    request_redeemer: Pubkey,
    min_fiat_redeem_amount: u64,
    fiat_flat_fee: u64,
) -> Result<()> {
    redeemer::update_redeemer(
        &ctx.accounts.vault_common.key(),
        &mut ctx.accounts.redeemer_vault,
        Some(request_redeemer),
        Some(min_fiat_redeem_amount),
        Some(fiat_flat_fee),
    )?;

    Ok(())
}
