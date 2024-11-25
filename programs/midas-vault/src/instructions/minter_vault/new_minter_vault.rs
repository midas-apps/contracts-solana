use anchor_lang::prelude::*;

use crate::{constants::seeds, state::{MinterVaultState, VaultCommonState}};

#[derive(Accounts)]
pub struct NewMinterVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        has_one = authority
    )]
    pub vault_common: Account<'info, VaultCommonState>,

    #[account(
        init, 
        payer = authority, 
        space = 0,
        seeds = [seeds::VAULT, minter_vault.key().as_ref()],
        bump
    )]
    pub reserve: Account<'info, VaultCommonState>,

    #[account(
        init,
        payer = authority,
        space = 8 + MinterVaultState::INIT_SPACE,
    )]
    pub minter_vault: Account<'info, MinterVaultState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(ctx: Context<NewMinterVault>, first_deposit_min_m_tokens: u64) -> Result<()> {
    // TODO: add event

    ctx.accounts.minter_vault.common_vault = ctx.accounts.vault_common.key();
    ctx.accounts.minter_vault.first_deposit_min_m_tokens = first_deposit_min_m_tokens;

    Ok(())
}
