use access_control::{program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::{prelude::*, solana_program::stake::instruction};

use crate::{
    constants::ac_roles,
    errors::MidasVaultsError,
    state::{PaymentMintState, VaultCommonState},
};

use anchor_spl::token_interface::{Mint, TokenInterface};

#[derive(Accounts)]
#[instruction(mint: Pubkey)]
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
        seeds = [PaymentMintState::SEED, vault_common.key().as_ref(), mint.as_ref()],
        bump
    )]
    pub payment_mint_state: Account<'info, PaymentMintState>,

    pub system_program: Program<'info, System>,
}

pub fn handle(ctx: Context<RemovePaymentToken>, mint: Pubkey) -> Result<()> {
    // TODO: add event
    Ok(())
}
