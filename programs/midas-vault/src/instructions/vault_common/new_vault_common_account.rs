use anchor_lang::prelude::*;

use crate::state::{VaultCommonAccountState, VaultCommonState};

#[derive(Accounts)]
pub struct NewVaultCommonAccount<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    /// CHECK:
    #[account(mut)]
    pub account: AccountInfo<'info>,

    #[account()]
    pub vault_common_state: Account<'info, VaultCommonState>,

    #[account(
        init,
        payer = signer,
        space = 8 + VaultCommonAccountState::INIT_SPACE,
        seeds = [VaultCommonAccountState::SEED, vault_common_state.key().as_ref(), account.key().as_ref()],
        bump
    )]
    pub vault_common_account: Account<'info, VaultCommonAccountState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(ctx: Context<NewVaultCommonAccount>) -> Result<()> {
    // TODO: add event
    Ok(())
}
