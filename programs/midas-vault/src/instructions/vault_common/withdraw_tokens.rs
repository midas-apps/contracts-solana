use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use data_feed::utils::decimals_conversion;

use crate::{
    constants::ac_roles,
    errors::MidasVaultsError,
    events::TokensWithdrawnEvent,
    program::MidasVaults,
    state::{MinterVaultStateV2, RedeemerVaultState, VaultCommonState},
    utils::transfer_token_with_signer,
};

#[derive(Accounts)]
pub struct WithdrawTokens<'info> {
    /// Account with vault admin role
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK:
    /// receiver of tokens
    #[account()]
    pub receiver: AccountInfo<'info>,

    /// Vault common state account
    #[account(mut)]
    pub vault_common: Account<'info, VaultCommonState>,

    /// Admin role of authority
    #[account(
        seeds = [AccountAccessControlRoleState::SEED, vault_common.ac_role.as_ref(), authority.key().as_ref(), ac_roles::VAULT_ADMIN],
        seeds::program = AccessControl::id(),
        bump,
    )]
    pub authority_admin_role: Account<'info, AccountAccessControlRoleState>,

    /// CHECK: can be either minter or redeemer vault
    #[account()]
    pub vault: AccountInfo<'info>,

    /// ATA of `receiver`
    #[account(
        mut,
        associated_token::token_program = token_program,
        associated_token::mint = mint,
        associated_token::authority = receiver,
    )]
    pub mint_receiver_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    /// ATA of `vault`
    #[account(
        mut,
        associated_token::token_program = token_program,
        associated_token::mint = mint,
        associated_token::authority = vault,
    )]
    pub mint_vault_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    /// SPL mint account to withdraw
    #[account(
        mut,
        mint::token_program = token_program,
    )]
    pub mint: Box<InterfaceAccount<'info, Mint>>,

    /// SPL token program
    pub token_program: Interface<'info, TokenInterface>,

    /// System program
    pub system_program: Program<'info, System>,
}

/// Withdraws any tokens from the vault to the receiver and emits an event.
/// Can only be called by the vault admin.
///
/// # Arguments
///
/// - `vault_seed` - seed of the vault. Will be used to sign CPI
/// - `amount` - amount to withdraw
pub fn handle(ctx: Context<WithdrawTokens>, vault_seed: Vec<u8>, amount: u64) -> Result<()> {
    let amount_base9 =
        decimals_conversion::convert_to_base_9(amount.into(), ctx.accounts.mint.decimals).unwrap();

    require!(
        MinterVaultStateV2::SEED.to_vec() == vault_seed
            || RedeemerVaultState::SEED.to_vec() == vault_seed,
        MidasVaultsError::InvalidSeedProvided
    );

    let (vault, _) = Pubkey::find_program_address(
        &[
            vault_seed.as_ref(),
            ctx.accounts.vault_common.key().as_ref(),
        ],
        &MidasVaults::id(),
    );

    require!(
        ctx.accounts.vault.key().eq(&vault),
        MidasVaultsError::InvalidVaultProvided
    );

    transfer_token_with_signer(
        &ctx.accounts.vault_common.key(),
        vault_seed.as_ref(),
        &ctx.accounts.token_program,
        &ctx.accounts.mint,
        &ctx.accounts.vault,
        &ctx.accounts.mint_vault_ata,
        &ctx.accounts.mint_receiver_ata,
        amount_base9,
    )?;

    emit!(TokensWithdrawnEvent {
        common_vault: ctx.accounts.vault_common.key(),
        mint: ctx.accounts.mint.key(),
        caller: ctx.accounts.authority.key(),
        receiver: ctx.accounts.receiver.key(),
        amount
    });

    Ok(())
}
