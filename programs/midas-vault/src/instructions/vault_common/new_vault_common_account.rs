use anchor_lang::prelude::*;

use crate::{
    events::CommonVaultAccountUpdatedEvent,
    state::{VaultCommonAccountState, VaultCommonState},
};

#[derive(Accounts)]
pub struct NewVaultCommonAccount<'info> {
    /// Signer and Payer
    #[account(mut)]
    pub signer: Signer<'info>,

    /// CHECK:
    /// User account
    #[account()]
    pub account: AccountInfo<'info>,

    /// Vault common state account
    #[account()]
    pub vault_common: Account<'info, VaultCommonState>,

    /// New vault common account
    #[account(
        init,
        payer = signer,
        space = 8 + VaultCommonAccountState::INIT_SPACE,
        seeds = [VaultCommonAccountState::SEED, vault_common.key().as_ref(), account.key().as_ref()],
        bump
    )]
    pub vault_common_account: Account<'info, VaultCommonAccountState>,

    /// System program
    pub system_program: Program<'info, System>,
}

/// Initializes a new vault common account for `ctx.account`
pub fn handle(ctx: Context<NewVaultCommonAccount>) -> Result<()> {
    emit!(CommonVaultAccountUpdatedEvent {
        common_vault: ctx.accounts.vault_common.key(),
        account: ctx.accounts.account.key(),
        free_from_min_amount: Some(false),
        free_from_min_first_mint: Some(false),
        waived_fee: Some(false),
    });

    Ok(())
}
