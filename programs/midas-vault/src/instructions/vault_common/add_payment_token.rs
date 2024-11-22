use anchor_lang::prelude::*;
use data_feed::{program::DataFeed, state::FeedState};

use crate::state::{PaymentMintState, VaultCommonState};

use anchor_spl::token_interface::{Mint, TokenInterface};

#[derive(Accounts)]
pub struct AddPaymentToken<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        has_one = authority
    )]
    pub vault_common_state: Account<'info, VaultCommonState>,

    #[account(
        init,
        payer = authority,
        space = 8 + PaymentMintState::INIT_SPACE,
        seeds = [PaymentMintState::SEED, vault_common_state.key().as_ref(), payment_mint.key().as_ref()],
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

pub fn handle(ctx: Context<AddPaymentToken>, fee: u64, allowance: u64, stable: bool) -> Result<()> {
    let state = &mut ctx.accounts.payment_mint_state;

    // TODO: add fee validation
    // TODO: add allowance validation

    state.data_feed = ctx.accounts.data_feed.key();
    state.fee = fee;
    state.allowance = allowance;
    state.stable = stable;

    // TODO: add event
    Ok(())
}
