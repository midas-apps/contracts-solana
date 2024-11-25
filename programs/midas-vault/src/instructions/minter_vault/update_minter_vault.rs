use anchor_lang::prelude::*;

use crate::state::{MinterVaultState, VaultCommonState};

#[derive(Accounts)]
pub struct UpdateMinterVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        has_one = authority
    )]
    pub vault_common: Account<'info, VaultCommonState>,

    #[account(mut)]
    pub minter_vault: Account<'info, MinterVaultState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(
    ctx: Context<UpdateMinterVault>,
    new_first_deposit_min_m_tokens: Option<u64>,
) -> Result<()> {
    // TODO: add event

    ctx.accounts.minter_vault.common_vault = ctx.accounts.vault_common.key();

    if let Some(new_first_deposit_min_m_tokens) = new_first_deposit_min_m_tokens {
        ctx.accounts.minter_vault.first_deposit_min_m_tokens = new_first_deposit_min_m_tokens;
    }

    Ok(())
}
