use anchor_lang::prelude::*;

use crate::{
    constants::seeds,
    errors::MidasVaultsError,
    state::{RedeemerVaultState, VaultCommonState},
};

#[derive(Accounts)]
pub struct NewRedeemerVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        has_one = authority @ MidasVaultsError::NotAuthority
    )]
    pub vault_common: Account<'info, VaultCommonState>,

    #[account(
        init,
        payer = authority,
        space = 8 + RedeemerVaultState::INIT_SPACE,
        seeds = [RedeemerVaultState::SEED, vault_common.key().as_ref()],
        bump

    )]
    pub redeemer_vault: Account<'info, RedeemerVaultState>,

    /// CHECK:
    #[account(
        init,
        payer = authority,
        space = 0,
        seeds = [seeds::REQUEST_REDEEMER, redeemer_vault.key().as_ref()],
        bump
    )]
    pub request_redeemer: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handle(
    ctx: Context<NewRedeemerVault>,
    min_fiat_redeem_amount: u64,
    fiat_additional_fee: u64,
    fiat_flat_fee: u64,
) -> Result<()> {
    // TODO: add event

    let vault = &mut ctx.accounts.redeemer_vault;

    vault.common_vault = ctx.accounts.vault_common.key();
    vault.min_fiat_redeem_amount = min_fiat_redeem_amount;
    vault.fiat_additional_fee = fiat_additional_fee;
    vault.fiat_flat_fee = fiat_flat_fee;

    Ok(())
}
