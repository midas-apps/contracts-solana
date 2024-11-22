use anchor_lang::prelude::*;

use crate::state::VaultCommonState;

#[derive(Accounts)]
pub struct UpdateVaultCommon<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        has_one = authority
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
    instant_daily_limit: Option<u64>,
    variation_tolerance: Option<u64>,
    min_amount: Option<u64>,
) -> Result<()> {
    let state = &mut ctx.accounts.vault_common;

    if let Some(authority) = authority {
        state.authority = authority;
    }

    if let Some(tokens_receiver) = tokens_receiver {
        state.tokens_receiver = tokens_receiver;
    }

    if let Some(fee_receiver) = fee_receiver {
        state.fee_receiver = fee_receiver;
    }

    if let Some(instant_fee) = instant_fee {
        state.instant_fee = instant_fee;
    }

    if let Some(instant_daily_limit) = instant_daily_limit {
        state.instant_daily_limit = instant_daily_limit;
    }

    if let Some(variation_tolerance) = variation_tolerance {
        state.variation_tolerance = variation_tolerance;
    }

    if let Some(min_amount) = min_amount {
        state.min_amount = min_amount;
    }

    // TODO: add event
    Ok(())
}
