use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;

use crate::{
    constants::ac_roles,
    errors::MidasVaultsError,
    state::{PaymentMintState, VaultCommonState},
};

use anchor_spl::token_interface::{Mint, TokenInterface};

#[derive(Accounts)]
pub struct RemovePaymentToken<'info> {
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
        mut,
        close = authority,
        seeds = [PaymentMintState::SEED, vault_common.key().as_ref(), payment_mint.key().as_ref()],
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
