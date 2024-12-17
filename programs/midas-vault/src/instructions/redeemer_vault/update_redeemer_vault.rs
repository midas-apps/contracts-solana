use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;

use crate::{
    constants::ac_roles,
    state::{RedeemerVaultState, VaultCommonState},
    utils::redeemer,
};

#[derive(Accounts)]
pub struct UpdateRedeemerVault<'info> {
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
        mut,
        seeds = [RedeemerVaultState::SEED, vault_common.key().as_ref()],
        bump
    )]
    pub redeemer_vault: Account<'info, RedeemerVaultState>,

    pub system_program: Program<'info, System>,
}

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
