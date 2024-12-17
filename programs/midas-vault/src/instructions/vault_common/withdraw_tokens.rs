use access_control::{
    program::AccessControl,
    state::AccountAccessControlRoleState,
};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, TokenAccount, TokenInterface};
use data_feed::utils::decimals_conversion;

use crate::{
    constants::ac_roles,
    errors::MidasVaultsError,
    events::TokensWithdrawnEvent,
    program::MidasVaults,
    state::{
        MinterVaultState, RedeemerVaultState, VaultCommonState,
    },
    utils::transfer_token,
};

#[derive(Accounts)]
pub struct WithdrawTokens<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    /// CHECK:
    #[account()]
    pub receiver: AccountInfo<'info>,

    #[account(mut)]
    pub vault_common: Account<'info, VaultCommonState>,

    #[account(
        seeds = [AccountAccessControlRoleState::SEED, vault_common.ac_role.as_ref(), authority.key().as_ref(), ac_roles::VAULT_ADMIN],
        seeds::program = AccessControl::id(),
        bump,
    )]
    pub authority_admin_role: Account<'info, AccountAccessControlRoleState>,

    /// CHECK: can be either minter or redeemer vault
    #[account()]
    pub vault: AccountInfo<'info>,

    #[account(
        mut,
        associated_token::token_program = token_program,
        associated_token::mint = mint,
        associated_token::authority = receiver,
    )]
    pub mint_receiver_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        associated_token::token_program = token_program,
        associated_token::mint = mint,
        associated_token::authority = vault,
    )]
    pub mint_vault_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        mint::token_program = token_program,
    )]
    pub mint: Box<InterfaceAccount<'info, Mint>>,

    pub token_program: Interface<'info, TokenInterface>,

    pub system_program: Program<'info, System>,
}

pub fn handle(ctx: Context<WithdrawTokens>, vault_seed: Vec<u8>, amount: u64) -> Result<()> {
    let amount_base9 =
        decimals_conversion::convert_to_base_9(amount.into(), ctx.accounts.mint.decimals).unwrap();

    require!(
        MinterVaultState::SEED.to_vec() == vault_seed
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

    transfer_token(
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
