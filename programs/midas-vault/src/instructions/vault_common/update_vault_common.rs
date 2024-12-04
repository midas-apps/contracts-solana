use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;

use crate::{
    constants::ac_roles, errors::MidasVaultsError, events::CommonVaultUpdatedEvent,
    state::VaultCommonState, utils::common_vault::update_common_vault,
};

#[derive(Accounts)]
pub struct UpdateVaultCommon<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(mut)]
    pub vault_common: Account<'info, VaultCommonState>,

    #[account(
        seeds = [AccountAccessControlRoleState::SEED, vault_common.ac_role.as_ref(), authority.key().as_ref(), ac_roles::VAULT_ADMIN],
        seeds::program = AccessControl::id(),
        bump,
    )]
    pub authority_ac_role: Account<'info, AccountAccessControlRoleState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(
    ctx: Context<UpdateVaultCommon>,
    ac_role: Option<Pubkey>,
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
        ac_role,
        tokens_receiver,
        fee_receiver,
        instant_fee,
        instant_daily_limit,
        variation_tolerance,
        min_amount,
    )?;

    emit!(CommonVaultUpdatedEvent {
        vault_common: ctx.accounts.vault_common.key(),
        ac_role,
        tokens_receiver,
        fee_receiver,
        instant_fee,
        instant_daily_limit,
        variation_tolerance,
        min_amount,
        ac: None,
        m_mint: None,
        m_mint_feed: None
    });

    Ok(())
}
