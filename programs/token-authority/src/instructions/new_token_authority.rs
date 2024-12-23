use anchor_lang::prelude::*;

use crate::state::TokenAuthorityState;

#[derive(Accounts)]
#[instruction(base_seed: [u8; 32])]
pub struct NewTokenAuthority<'info> {
    /// Init Payer and signer
    #[account(mut)]
    pub signer: Signer<'info>,

    /// New Token authority PDA
    #[account(
        init,
        payer = signer,
        space = 8 + TokenAuthorityState::INIT_SPACE,
        seeds = [TokenAuthorityState::SEED, base_seed.as_ref()],
        bump
    )]
    pub token_authority: Account<'info, TokenAuthorityState>,

    pub system_program: Program<'info, System>,
}

/// Initializes new `token_authority` pda using `base_seed` seed
///
/// # Arguments
///
/// - `base_seed` - base seed of the pda
/// - `ac_role` - AccessControlRole account
pub fn handle(ctx: Context<NewTokenAuthority>, base_seed: [u8; 32], ac_role: Pubkey) -> Result<()> {
    ctx.accounts.token_authority.ac_role = ac_role;
    ctx.accounts.token_authority.base_seed = base_seed;

    Ok(())
}
