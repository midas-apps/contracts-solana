use anchor_lang::prelude::*;

use crate::{
    constants::seeds,
    state::{MintAuthorityState, MinterVaultState, VaultCommonState},
};

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
        space = 8 + MinterVaultState::INIT_SPACE,
        seeds = [MinterVaultState::SEED, vault_common.key().as_ref()],
        bump
    )]
    pub minter_vault: Account<'info, MinterVaultState>,

    #[account(
        seeds = [MintAuthorityState::SEED, mint_authority.base_seed.as_ref()],
        bump,
        has_one = authority
    )]
    pub mint_authority: Account<'info, MintAuthorityState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(ctx: Context<NewMinterVault>, first_deposit_min_m_tokens: u64) -> Result<()> {
    // TODO: add event

    ctx.accounts.minter_vault.common_vault = ctx.accounts.vault_common.key();
    ctx.accounts.minter_vault.first_deposit_min_m_tokens = first_deposit_min_m_tokens;
    ctx.accounts.minter_vault.mint_authority_pda = ctx.accounts.mint_authority.key();

    Ok(())
}
