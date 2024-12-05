use anchor_lang::prelude::*;

use crate::{
    events::{CommonVaultAccountUpdatedEvent, CommonVaultUpdatedEvent},
    state::VaultCommonState,
    utils::common_vault::update_common_vault,
};

#[derive(Accounts)]
pub struct NewVaultCommon<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        space = 8 + VaultCommonState::INIT_SPACE,
    )]
    pub vault_common: Account<'info, VaultCommonState>,

    pub system_program: Program<'info, System>,
}
// TODO: move params to struct
pub fn handle(
    ctx: Context<NewVaultCommon>,
    ac: Pubkey,
    m_mint: Pubkey,
    m_mint_feed: Pubkey,
    greenlist_enforced: bool,
    ac_role: Pubkey,
    tokens_receiver: Pubkey,
    fee_receiver: Pubkey,
    instant_fee: u64,
    instant_daily_limit: u128,
    variation_tolerance: u64,
    min_amount: u64,
) -> Result<()> {
    let state = &mut ctx.accounts.vault_common;

    state.ac = ac;
    state.m_mint = m_mint;
    state.m_mint_feed = m_mint_feed;

    update_common_vault(
        state,
        Some(greenlist_enforced),
        Some(ac_role),
        Some(tokens_receiver),
        Some(fee_receiver),
        Some(instant_fee),
        Some(instant_daily_limit),
        Some(variation_tolerance),
        Some(min_amount),
    )?;

    emit!(CommonVaultUpdatedEvent {
        vault_common: ctx.accounts.vault_common.key(),
        ac: Some(ac),
        m_mint: Some(m_mint),
        m_mint_feed: Some(m_mint_feed),
        ac_role: Some(ac_role),
        tokens_receiver: Some(tokens_receiver),
        fee_receiver: Some(fee_receiver),
        instant_fee: Some(instant_fee),
        instant_daily_limit: Some(instant_daily_limit),
        variation_tolerance: Some(variation_tolerance),
        min_amount: Some(min_amount),
        greenlist_enforced: Some(greenlist_enforced)
    });

    Ok(())
}
