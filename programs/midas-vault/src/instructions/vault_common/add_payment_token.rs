use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;
use data_feed::{program::DataFeed, state::FeedState};

use crate::{
    constants::ac_roles,
    errors::MidasVaultsError,
    state::{PaymentMintState, VaultCommonState},
    utils::common_vault,
};

use anchor_spl::token_interface::{Mint, TokenInterface};

#[derive(Accounts)]
pub struct AddPaymentToken<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account()]
    pub vault_common: Account<'info, VaultCommonState>,

    #[account(
        seeds = [AccountAccessControlRoleState::SEED, vault_common.ac_role.as_ref(), authority.key().as_ref(), ac_roles::VAULT_ADMIN],
        seeds::program = AccessControl::id(),
        bump,
    )]
    pub authority_ac_role: Account<'info, AccountAccessControlRoleState>,

    #[account(
        init,
        payer = authority,
        space = 8 + PaymentMintState::INIT_SPACE,
        seeds = [PaymentMintState::SEED, vault_common.key().as_ref(), payment_mint.key().as_ref()],
        bump
    )]
    pub payment_mint_state: Account<'info, PaymentMintState>,

    #[account(
        mint::token_program = token_program
    )]
    pub payment_mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        owner = data_feed_program.key()
    )]
    pub data_feed: Account<'info, FeedState>,

    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub data_feed_program: Program<'info, DataFeed>,
}

pub fn handle(
    ctx: Context<AddPaymentToken>,
    fee: u64,
    allowance: u128,
    stable: bool,
) -> Result<()> {
    common_vault::update_payment_token(
        &ctx.accounts.vault_common.key(),
        &mut ctx.accounts.payment_mint_state,
        &ctx.accounts.payment_mint.key(),
        &Some(ctx.accounts.data_feed.key()),
        Some(fee),
        Some(allowance),
        Some(stable),
    )?;

    Ok(())
}
