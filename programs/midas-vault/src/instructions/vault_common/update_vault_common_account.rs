use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;

use crate::{
    constants::ac_roles,
    errors::MidasVaultsError,
    state::{VaultCommonAccountState, VaultCommonState},
};

#[derive(Accounts)]
pub struct UpdateVaultCommonAccount<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK:
    #[account(mut)]
    pub account: AccountInfo<'info>,

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
        seeds = [VaultCommonAccountState::SEED, vault_common.key().as_ref(), account.key().as_ref()],
        bump
    )]
    pub vault_common_account: Account<'info, VaultCommonAccountState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(
    ctx: Context<UpdateVaultCommonAccount>,
    free_from_min_amount: Option<bool>,
    free_from_min_first_mint: Option<bool>,
    waived_fee: Option<bool>,
) -> Result<()> {
    let state = &mut ctx.accounts.vault_common_account;

    if let Some(new_free_from_min_amount) = free_from_min_amount {
        state.free_from_min_amount = new_free_from_min_amount;
    }

    if let Some(free_from_min_first_mint) = free_from_min_first_mint {
        state.free_from_min_first_mint = free_from_min_first_mint;
    }

    if let Some(new_waived_fee) = waived_fee {
        state.waived_fee = new_waived_fee;
    }

    // TODO: add event
    Ok(())
}
