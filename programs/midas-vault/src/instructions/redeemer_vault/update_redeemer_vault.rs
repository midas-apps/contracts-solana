use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;

use crate::{
    constants::ac_roles,
    state::{RedeemerVaultState, VaultCommonState},
    utils::redeemer,
};

#[derive(Accounts)]
pub struct UpdateRedeemerVault<'info> {
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
        mut,
        seeds = [RedeemerVaultState::SEED, vault_common.key().as_ref()],
        bump
    )]
    pub redeemer_vault: Account<'info, RedeemerVaultState>,

    /// System program
    pub system_program: Program<'info, System>,
}

/// Updates redeemer vault state and emits an event.
/// Can only be called by the vault admin.
///
/// # Arguments
///
/// - `request_redeemer` - New redeemer account address.
/// - `min_fiat_redeem_amount` - New minimum fiat redeem amount.
/// - `fiat_flat_fee` - New fiat flat fee.
pub fn handle(
    ctx: Context<UpdateRedeemerVault>,
    request_redeemer: Option<Pubkey>,
    min_fiat_redeem_amount: Option<u64>,
    fiat_flat_fee: Option<u64>,
) -> Result<()> {
    redeemer::update_redeemer(
        &ctx.accounts.vault_common.key(),
        &mut ctx.accounts.redeemer_vault,
        request_redeemer,
        min_fiat_redeem_amount,
        fiat_flat_fee,
    )?;

    Ok(())
}
