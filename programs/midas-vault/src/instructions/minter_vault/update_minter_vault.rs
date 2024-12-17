use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;

use crate::{
    constants::ac_roles,
    events::MinterVaultUpdatedEvent,
    state::{MinterVaultState, VaultCommonState},
};

#[derive(Accounts)]
pub struct UpdateMinterVault<'info> {
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
        seeds = [MinterVaultState::SEED, vault_common.key().as_ref()],
        bump
    )]
    pub minter_vault: Account<'info, MinterVaultState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(
    ctx: Context<UpdateMinterVault>,
    first_deposit_min_m_tokens: Option<u64>,
    mint_authority_pda: Option<Pubkey>,
) -> Result<()> {
    if let Some(first_deposit_min_m_tokens) = first_deposit_min_m_tokens {
        ctx.accounts.minter_vault.first_deposit_min_m_tokens = first_deposit_min_m_tokens;
    }

    if let Some(mint_authority_pda) = mint_authority_pda {
        ctx.accounts.minter_vault.mint_authority_pda = mint_authority_pda;
    }

    emit!(MinterVaultUpdatedEvent {
        common_vault: ctx.accounts.vault_common.key(),
        first_deposit_min_m_tokens,
        mint_authority_pda
    });

    Ok(())
}
