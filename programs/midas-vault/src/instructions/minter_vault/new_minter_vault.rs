use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;
use token_authority::{program::TokenAuthority, state::TokenAuthorityState};

use crate::{
    constants::ac_roles,
    events::MinterVaultUpdatedEventV2,
    state::{MinterVaultState, VaultCommonState},
};

#[derive(Accounts)]
pub struct NewMinterVault<'info> {
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
        init,
        payer = authority,
        space = 8 + MinterVaultState::INIT_SPACE,
        seeds = [MinterVaultState::SEED, vault_common.key().as_ref()],
        bump
    )]
    pub minter_vault: Account<'info, MinterVaultState>,

    /// Token authority state account
    #[account(
        seeds = [TokenAuthorityState::SEED, token_authority.base_seed.as_ref()],
        seeds::program = TokenAuthority::id(),
        owner = TokenAuthority::id(),
        bump,
    )]
    pub token_authority: Account<'info, TokenAuthorityState>,

    /// Token authority program
    pub token_authority_program: Program<'info, TokenAuthority>,
    /// System program
    pub system_program: Program<'info, System>,
}

/// Initializes minter vault account and emits an event.
/// Can only be called by the vault admin.
///
/// # Arguments
///
/// - `first_deposit_min_m_tokens` - minimum amount of mTokens required for the first deposit
/// - `max_supply_cap` - maximum supply cap for mToken minting (use u64::MAX for no cap)
pub fn handle(
    ctx: Context<NewMinterVault>,
    first_deposit_min_m_tokens: u64,
    max_supply_cap: u64,
) -> Result<()> {
    ctx.accounts.minter_vault.common_vault = ctx.accounts.vault_common.key();
    ctx.accounts.minter_vault.first_deposit_min_m_tokens = first_deposit_min_m_tokens;
    ctx.accounts.minter_vault.mint_authority_pda = ctx.accounts.token_authority.key();
    ctx.accounts.minter_vault.max_supply_cap = max_supply_cap;

    emit!(MinterVaultUpdatedEventV2 {
        common_vault: ctx.accounts.vault_common.key(),
        first_deposit_min_m_tokens: Some(first_deposit_min_m_tokens),
        mint_authority_pda: Some(ctx.accounts.token_authority.key()),
        max_supply_cap: Some(max_supply_cap),
    });

    Ok(())
}
