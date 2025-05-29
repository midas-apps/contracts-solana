use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;

use crate::{
    constants::ac_roles,
    events::RedeemerVaultRequestRejectedEvent,
    state::{RedeemerVaultRequestState, RedeemerVaultState, VaultCommonState},
};

#[derive(Accounts)]
#[instruction(request_id: u64)]
pub struct RejectRedeemRequest<'info> {
    /// Account with vault admin role
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK:
    /// request user account
    #[account(mut,
        address = redeem_request.user
    )]
    pub user_account: AccountInfo<'info>,

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

    /// Redeem request state account
    #[account(
        mut,
        close = user_account,
        seeds = [RedeemerVaultRequestState::SEED, redeemer_vault.key().as_ref(), &request_id.to_le_bytes()],
        bump,
    )]
    pub redeem_request: Account<'info, RedeemerVaultRequestState>,

    /// System program
    pub system_program: Program<'info, System>,
}

/// Rejects redeem request, close request account and emits an event.
/// Can only be called by the vault admin.
///
/// # Arguments
///
/// - `request_id` - id of the request to reject
pub fn handle(ctx: Context<RejectRedeemRequest>, request_id: u64) -> Result<()> {
    emit!(RedeemerVaultRequestRejectedEvent {
        common_vault: ctx.accounts.vault_common.key(),
        request_id
    });

    Ok(())
}
