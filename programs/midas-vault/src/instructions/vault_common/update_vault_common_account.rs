use anchor_lang::prelude::*;

use crate::{
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

    #[account(
        has_one = authority @ MidasVaultsError::NotAuthority
    )]
    pub vault_common_state: Account<'info, VaultCommonState>,

    #[account(
        mut,
        seeds = [VaultCommonAccountState::SEED, vault_common_state.key().as_ref(), account.key().as_ref()],
        bump
    )]
    pub vault_common_account: Account<'info, VaultCommonAccountState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(
    ctx: Context<UpdateVaultCommonAccount>,
    free_from_min_amount: Option<bool>,
    waived_fee: Option<bool>,
) -> Result<()> {
    let state = &mut ctx.accounts.vault_common_account;

    if let Some(new_free_from_min_amount) = free_from_min_amount {
        state.free_from_min_amount = new_free_from_min_amount;
    }

    if let Some(new_waived_fee) = waived_fee {
        state.waived_fee = new_waived_fee;
    }

    // TODO: add event
    Ok(())
}
