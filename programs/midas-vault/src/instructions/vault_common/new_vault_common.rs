use anchor_lang::prelude::*;

use crate::state::VaultCommonState;

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

    authority: Pubkey,
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

    state.authority = authority;
    state.tokens_receiver = tokens_receiver;
    state.fee_receiver = fee_receiver;
    state.instant_fee = instant_fee;
    state.instant_daily_limit = instant_daily_limit;
    state.variation_tolerance = variation_tolerance;
    state.min_amount = min_amount;

    Ok(())
    // TODO: add event
}
