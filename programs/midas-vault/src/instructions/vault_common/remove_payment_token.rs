use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;

use crate::{
    constants::ac_roles,
    events::PaymentTokenRemovedEvent,
    state::{PaymentMintState, VaultCommonState},
};

#[derive(Accounts)]
#[instruction(mint: Pubkey)]
pub struct RemovePaymentToken<'info> {
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

    /// Payment mint state account
    #[account(
        mut,
        close = authority,
        seeds = [PaymentMintState::SEED, vault_common.key().as_ref(), mint.as_ref()],
        bump
    )]
    pub payment_mint_state: Account<'info, PaymentMintState>,

    /// System program
    pub system_program: Program<'info, System>,
}

/// Removes a payment token from the vault and closes the
/// `payment_mint_state` account.
/// Can only be called by the vault admin.
///
/// # Arguments
///
/// - `mint` - mint of the payment token to remove
pub fn handle(ctx: Context<RemovePaymentToken>, mint: Pubkey) -> Result<()> {
    emit!(PaymentTokenRemovedEvent {
        common_vault: ctx.accounts.vault_common.key(),
        mint
    });

    Ok(())
}
