use anchor_lang::prelude::*;

use crate::{
    errors::MidasVaultsError,
    state::{MinterVaultState, RedeemerVaultState, VaultCommonState},
};

#[derive(Accounts)]
pub struct UpdateRedeemerVault<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        has_one = authority @ MidasVaultsError::NotAuthority
    )]
    pub vault_common: Account<'info, VaultCommonState>,

    #[account(mut,
        seeds = [RedeemerVaultState::SEED, vault_common.key().as_ref()],
        bump
    )]
    pub redeemer_vault: Account<'info, RedeemerVaultState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(
    ctx: Context<UpdateRedeemerVault>,
    min_fiat_redeem_amount: Option<u64>,
    fiat_additional_fee: Option<u64>,
    fiat_flat_fee: Option<u64>,
    request_redeemer: Option<Pubkey>,
) -> Result<()> {
    // TODO: add event
    let vault = &mut ctx.accounts.redeemer_vault;

    if let Some(min_fiat_redeem_amount) = min_fiat_redeem_amount {
        vault.min_fiat_redeem_amount = min_fiat_redeem_amount;
    }

    if let Some(fiat_additional_fee) = fiat_additional_fee {
        vault.fiat_additional_fee = fiat_additional_fee;
    }

    if let Some(fiat_flat_fee) = fiat_flat_fee {
        vault.fiat_flat_fee = fiat_flat_fee;
    }

    if let Some(request_redeemer) = request_redeemer {
        vault.request_redeemer = request_redeemer;
    }

    Ok(())
}
