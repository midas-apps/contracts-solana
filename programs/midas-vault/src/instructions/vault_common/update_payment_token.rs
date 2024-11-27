use anchor_lang::prelude::*;
use data_feed::{program::DataFeed, state::FeedState};

use crate::state::{PaymentMintState, VaultCommonState};

use anchor_spl::token_interface::{Mint, TokenInterface};

#[derive(Accounts)]
pub struct UpdatePaymentToken<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        has_one = authority
    )]
    pub vault_common_state: Account<'info, VaultCommonState>,

    #[account(
        mut,
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
    pub new_data_feed: Option<Account<'info, FeedState>>,

    pub data_feed_program: Program<'info, DataFeed>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handle(
    ctx: Context<UpdatePaymentToken>,
    fee: Option<u64>,
    allowance: Option<u128>,
    stable: Option<bool>,
) -> Result<()> {
    let state = &mut ctx.accounts.payment_mint_state;

    if let Some(new_feed) = &mut ctx.accounts.new_data_feed {
        state.data_feed = new_feed.key();
    }

    if let Some(new_fee) = fee {
        state.fee = new_fee;
    }

    if let Some(new_allowance) = allowance {
        state.allowance = new_allowance;
    }

    if let Some(new_stable) = stable {
        state.stable = new_stable;
    }

    // TODO: add event
    Ok(())
}
