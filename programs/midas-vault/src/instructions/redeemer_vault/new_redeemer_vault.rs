use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;

use crate::{
    constants::{ac_roles, seeds},
    errors::MidasVaultsError,
    state::{RedeemerVaultState, VaultCommonState},
    utils::redeemer,
};

#[derive(Accounts)]
pub struct NewRedeemerVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account()]
    pub vault_common: Account<'info, VaultCommonState>,

    #[account(
        seeds = [AccountAccessControlRoleState::SEED, vault_common.ac_role.as_ref(), authority.key().as_ref(), ac_roles::VAULT_ADMIN],
        seeds::program = AccessControl::id(),
        bump,
    )]
    pub authority_ac_role: Account<'info, AccountAccessControlRoleState>,

    #[account(
        init,
        payer = authority,
        space = 8 + RedeemerVaultState::INIT_SPACE,
        seeds = [RedeemerVaultState::SEED, vault_common.key().as_ref()],
        bump

    )]
    pub redeemer_vault: Account<'info, RedeemerVaultState>,

    /// CHECK:
    #[account(
        init,
        payer = authority,
        space = 0,
        seeds = [seeds::REQUEST_REDEEMER, redeemer_vault.key().as_ref()],
        bump
    )]
    pub request_redeemer: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle(
    ctx: Context<NewRedeemerVault>,
    min_fiat_redeem_amount: u64,
    fiat_additional_fee: u64,
    fiat_flat_fee: u64,
) -> Result<()> {
    redeemer::update_redeemer(
        &ctx.accounts.vault_common.key(),
        &mut ctx.accounts.redeemer_vault,
        Some(min_fiat_redeem_amount),
        Some(fiat_additional_fee),
        Some(fiat_flat_fee),
    )?;

    Ok(())
}
