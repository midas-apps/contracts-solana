use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;
use data_feed::{program::DataFeed, state::FeedState};

use crate::{
    constants::ac_roles,
    state::{PaymentMintState, VaultCommonState},
    utils::common_vault,
};

#[derive(Accounts)]
pub struct UpdatePaymentToken<'info> {
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

    /// Payment mint state account
    #[account(
        mut,
        seeds = [PaymentMintState::SEED, vault_common.key().as_ref(), payment_mint_state.mint.key().as_ref()],
        bump
    )]
    pub payment_mint_state: Account<'info, PaymentMintState>,

    /// New data feed account that will be set for the payment mint
    #[account(
        owner = data_feed_program.key()
    )]
    pub new_data_feed: Option<Account<'info, FeedState>>,

    /// Data feed program
    pub data_feed_program: Program<'info, DataFeed>,
    /// System program
    pub system_program: Program<'info, System>,
}

/// Updates the payment token with new data feed, fee, allowance and stable flag.
/// Can only be called by the vault admin.
///
/// # Arguments
///
/// - `fee` - new fee for the payment token
/// - `allowance` - new allowance for the payment token
/// - `stable` - new stable flag for the payment token
pub fn handle(
    ctx: Context<UpdatePaymentToken>,
    fee: Option<u64>,
    allowance: Option<u128>,
    stable: Option<bool>,
) -> Result<()> {
    let data_feed = ctx
        .accounts
        .new_data_feed
        .as_ref()
        .map(|new_data_feed| new_data_feed.key());

    let mint = &ctx.accounts.payment_mint_state.mint.clone();

    common_vault::update_payment_token(
        &ctx.accounts.vault_common.key(),
        &mut ctx.accounts.payment_mint_state,
        mint,
        &data_feed,
        fee,
        allowance,
        stable,
    )?;

    Ok(())
}
