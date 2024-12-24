use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;

use crate::{
    constants::{ac_roles, FIAT_MINT},
    state::{PaymentMintState, VaultCommonState},
    utils::common_vault,
};

#[derive(Accounts)]
pub struct AddPaymentTokenFiat<'info> {
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
        init,
        payer = authority,
        space = 8 + PaymentMintState::INIT_SPACE,
        seeds = [PaymentMintState::SEED, vault_common.key().as_ref(), FIAT_MINT.key().as_ref()],
        bump
    )]
    pub payment_mint_state: Account<'info, PaymentMintState>,

    pub system_program: Program<'info, System>,
}

/// Adds a new fiat payment token to the vault
/// Can only be called by the vault admin.
///
/// # Arguments
///
/// - `fee` - initial fee for the payment token
/// - `allowance` - initial allowance for the fiat payment token
pub fn handle(ctx: Context<AddPaymentTokenFiat>, fee: u64, allowance: u128) -> Result<()> {
    common_vault::update_payment_token(
        &ctx.accounts.vault_common.key(),
        &mut ctx.accounts.payment_mint_state,
        &FIAT_MINT,
        &None,
        Some(fee),
        Some(allowance),
        None,
    )?;

    Ok(())
}
