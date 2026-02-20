use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;

use crate::{
    constants::ac_roles,
    events::MinterVaultUpdatedEvent,
    state::{MinterVaultStateV2, VaultCommonState},
};

#[derive(Accounts)]
pub struct UpdateMinterVault<'info> {
    /// Account with vault admin role
    #[account(mut)]
    pub authority: Signer<'info>,

    /// Vault common state account
    #[account()]
    pub vault_common: Account<'info, VaultCommonState>,

    /// Admin role of authority
    #[account(
        seeds = [AccountAccessControlRoleState::SEED, vault_common.ac_role.as_ref(), authority.key().as_ref(), ac_roles::VAULT_ADMIN],
        seeds::program = AccessControl::id(),
        bump,
    )]
    pub authority_ac_role: Account<'info, AccountAccessControlRoleState>,

    /// Minter vault state account
    #[account(
        mut,
        seeds = [MinterVaultStateV2::SEED, vault_common.key().as_ref()],
        bump
    )]
    pub minter_vault: Account<'info, MinterVaultStateV2>,

    /// System program
    pub system_program: Program<'info, System>,
}

/// Updates the minter vault account with new values and emits an event.
/// Can only be called by the vault admin.
///
/// # Arguments
///
/// - `first_deposit_min_m_tokens` - new value for `first_deposit_min_m_tokens`
/// - `mint_authority_pda` - new value for `mint_authority_pda`
/// - `max_supply_cap` - new value for `max_supply_cap` (use u64::MAX for no cap)
pub fn handle(
    ctx: Context<UpdateMinterVault>,
    first_deposit_min_m_tokens: Option<u64>,
    mint_authority_pda: Option<Pubkey>,
    max_supply_cap: Option<u64>,
) -> Result<()> {
    if let Some(first_deposit_min_m_tokens) = first_deposit_min_m_tokens {
        ctx.accounts.minter_vault.first_deposit_min_m_tokens = first_deposit_min_m_tokens;
    }

    if let Some(mint_authority_pda) = mint_authority_pda {
        ctx.accounts.minter_vault.mint_authority_pda = mint_authority_pda;
    }

    if let Some(max_supply_cap) = max_supply_cap {
        ctx.accounts.minter_vault.max_supply_cap = max_supply_cap;
    }

    emit!(MinterVaultUpdatedEvent {
        common_vault: ctx.accounts.vault_common.key(),
        first_deposit_min_m_tokens,
        mint_authority_pda,
        max_supply_cap,
    });

    Ok(())
}
