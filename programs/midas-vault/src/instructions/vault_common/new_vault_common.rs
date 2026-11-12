use access_control::{
    program::AccessControl,
    state::{AccessControlRoleState, AccessControlState},
};
use anchor_lang::prelude::*;

use crate::{
    events::CommonVaultUpdatedEvent, state::VaultCommonState,
    utils::common_vault::update_common_vault,
};

#[derive(Accounts)]
pub struct NewVaultCommon<'info> {
    /// Signer and Payer
    #[account(mut)]
    pub signer: Signer<'info>,

    /// `AccessControlState` instance
    #[account(
        owner = AccessControl::id()
    )]
    pub ac: Account<'info, AccessControlState>,

    /// AC Role state account
    #[account(owner = AccessControl::id())]
    pub ac_role: Account<'info, AccessControlRoleState>,

    /// New vault common account
    #[account(
        init,
        payer = signer,
        space = 8 + VaultCommonState::INIT_SPACE,
    )]
    pub vault_common: Account<'info, VaultCommonState>,

    /// System program
    pub system_program: Program<'info, System>,
}

/// Initializes a new vault common account and emits an event.
/// Currently, parameters `ac`, `m_mint` and `m_mint_feed`
/// are immutable and cannot be changed after initialization
///
/// # Arguments
///
/// - `m_mint` - mToken mint pubkey
/// - `m_mint_feed` - mToken data_feed::FeedState pubkey
/// - `greenlist_enforced` - if true, only greenlisted accounts can interact with the vault
/// - `tokens_receiver` - pubkey that will receive tokens from the vault (not ATA)
/// - `fee_receiver` - pubkey that will receive fees from the vault (not ATA)
/// - `instant_fee` - % fee that will be charged for instant swaps
/// - `instant_daily_limit` - daily limit in mToken for instant operations
/// - `variation_tolerance` - % max. price deviation for request approval
/// - `min_amount` - min amount for all operations in mToken
pub fn handle(
    ctx: Context<NewVaultCommon>,
    m_mint: Pubkey,
    m_mint_feed: Pubkey,
    greenlist_enforced: bool,
    tokens_receiver: Pubkey,
    fee_receiver: Pubkey,
    instant_fee: u64,
    instant_daily_limit: u128,
    variation_tolerance: u64,
    min_amount: u64,
) -> Result<()> {
    let state = &mut ctx.accounts.vault_common;

    let ac = ctx.accounts.ac.key();
    let ac_role = ctx.accounts.ac_role.key();

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
