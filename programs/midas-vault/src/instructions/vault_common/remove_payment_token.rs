use anchor_lang::prelude::*;

use crate::state::{PaymentMintState, VaultCommonState};

use anchor_spl::token_interface::{Mint, TokenInterface};

#[derive(Accounts)]
pub struct RemovePaymentToken<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        has_one = authority
    )]
    pub vault_common_state: Account<'info, VaultCommonState>,

    #[account(
        mut,
        close = authority,
        seeds = [PaymentMintState::SEED, vault_common_state.key().as_ref(), payment_mint.key().as_ref()],
        bump
    )]
    pub payment_mint_state: Account<'info, PaymentMintState>,

    #[account(
        mint::token_program = token_program
    )]
    pub payment_mint: Box<InterfaceAccount<'info, Mint>>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

pub fn handle(ctx: Context<RemovePaymentToken>) -> Result<()> {
    // TODO: add event
    Ok(())
}
