use anchor_lang::prelude::*;

use crate::{
    errors::MidasVaultsError, events::CommonVaultUpdatedEvent, state::VaultCommonState,
    utils::common_vault::update_common_vault,
};

#[derive(Accounts)]
pub struct UpdateVaultCommon<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        has_one = authority @ MidasVaultsError::NotAuthority
    )]
    pub vault_common: Account<'info, VaultCommonState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(
    ctx: Context<UpdateVaultCommon>,
    authority: Option<Pubkey>,
    tokens_receiver: Option<Pubkey>,
    fee_receiver: Option<Pubkey>,
    instant_fee: Option<u64>,
    instant_daily_limit: Option<u128>,
    variation_tolerance: Option<u64>,
    min_amount: Option<u64>,
) -> Result<()> {
    let state = &mut ctx.accounts.vault_common;

    update_common_vault(
        state,
        authority,
        tokens_receiver,
        fee_receiver,
        instant_fee,
        instant_daily_limit,
        variation_tolerance,
        min_amount,
    )?;

    emit!(CommonVaultUpdatedEvent {
        vault_common: ctx.accounts.vault_common.key(),
        authority,
        tokens_receiver,
        fee_receiver,
        instant_fee,
        instant_daily_limit,
        variation_tolerance,
        min_amount,
    });

    Ok(())
}
