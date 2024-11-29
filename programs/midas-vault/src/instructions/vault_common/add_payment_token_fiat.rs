use anchor_lang::prelude::*;

use crate::{
    constants::FIAT_MINT,
    errors::MidasVaultsError,
    state::{PaymentMintState, VaultCommonState},
    utils::common_vault,
};

#[derive(Accounts)]
pub struct AddPaymentTokenFiat<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        has_one = authority @ MidasVaultsError::NotAuthority
    )]
    pub vault_common_state: Account<'info, VaultCommonState>,

    #[account(
        init,
        payer = authority,
        space = 8 + PaymentMintState::INIT_SPACE,
        seeds = [PaymentMintState::SEED, vault_common_state.key().as_ref(), FIAT_MINT.key().as_ref()],
        bump
    )]
    pub payment_mint_state: Account<'info, PaymentMintState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(ctx: Context<AddPaymentTokenFiat>, fee: u64, allowance: u128) -> Result<()> {
    common_vault::update_payment_token(
        &mut ctx.accounts.payment_mint_state,
        &FIAT_MINT,
        &None,
        Some(fee),
        Some(allowance),
        None,
    )?;

    // TODO: add event
    Ok(())
}
