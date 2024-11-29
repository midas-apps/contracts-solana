use anchor_lang::prelude::*;
use data_feed::{program::DataFeed, state::FeedState};

use crate::{
    errors::MidasVaultsError,
    state::{PaymentMintState, VaultCommonState},
    utils::common_vault,
};

#[derive(Accounts)]
pub struct UpdatePaymentToken<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        has_one = authority @ MidasVaultsError::NotAuthority
    )]
    pub vault_common_state: Account<'info, VaultCommonState>,

    #[account(
        mut,
        seeds = [PaymentMintState::SEED, vault_common_state.key().as_ref(), payment_mint_state.mint.key().as_ref()],
        bump
    )]
    pub payment_mint_state: Account<'info, PaymentMintState>,

    #[account(
        owner = data_feed_program.key()
    )]
    pub new_data_feed: Option<Account<'info, FeedState>>,

    pub data_feed_program: Program<'info, DataFeed>,
    pub system_program: Program<'info, System>,
}

pub fn handle(
    ctx: Context<UpdatePaymentToken>,
    fee: Option<u64>,
    allowance: Option<u128>,
    stable: Option<bool>,
) -> Result<()> {
    let data_feed = if let Some(new_data_feed) = &ctx.accounts.new_data_feed {
        Some(new_data_feed.key())
    } else {
        None
    };

    let mint = &ctx.accounts.payment_mint_state.mint.clone();

    common_vault::update_payment_token(
        &mut ctx.accounts.payment_mint_state,
        mint,
        &data_feed,
        fee,
        allowance,
        stable,
    )?;

    // TODO: add event
    Ok(())
}
