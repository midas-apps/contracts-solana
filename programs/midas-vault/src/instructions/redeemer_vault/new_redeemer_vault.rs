use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;

use crate::{
    constants::ac_roles,
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

    pub system_program: Program<'info, System>,
}

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
