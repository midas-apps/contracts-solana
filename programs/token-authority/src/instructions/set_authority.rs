use access_control::{constants::ac_roles, program::AccessControl, state::AccountAccessControlRoleState};
use anchor_lang::prelude::*;
use anchor_spl::{token_2022::{mint_to, set_authority, spl_token_2022::{self, instruction::AuthorityType}, MintTo, SetAuthority as SplSetAuthority}, token_interface::{Mint as SplMint, TokenAccount, TokenInterface}};

use crate::{
    program::TokenAuthority, state::TokenAuthorityState
};

#[derive(Accounts)]
pub struct SetAuthority<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [TokenAuthorityState::SEED, token_authority.base_seed.as_ref()],
        bump    
    )]
    pub token_authority: Account<'info, TokenAuthorityState>,

    #[account(
        seeds = [AccountAccessControlRoleState::SEED, token_authority.ac_role.as_ref(), authority.key().as_ref(), ac_roles::ADMIN],
        seeds::program = AccessControl::id(),
        bump,
    )]
    pub authority_admin_role: Account<'info, AccountAccessControlRoleState>,

    /// CHECK:
    #[account(mut)]
    pub account_or_mint: AccountInfo<'info>,

    pub token_program: Interface<'info, TokenInterface>,

    pub system_program: Program<'info, System>,
}


pub fn handle(
    ctx: Context<SetAuthority>, 
    authority_type: u8,
    new_authority: Option<Pubkey>
) -> Result<()> {
    let (_, vault_pda_bump_seed) = Pubkey::find_program_address(
        &[TokenAuthorityState::SEED, ctx.accounts.token_authority.base_seed.as_ref()],
        &TokenAuthority::id(),
    );

    set_authority(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            SplSetAuthority {
                current_authority: ctx.accounts.token_authority.to_account_info(),
                account_or_mint: ctx.accounts.account_or_mint.to_account_info()
            },
            &[&[
                TokenAuthorityState::SEED,
                ctx.accounts.token_authority.base_seed.as_ref(),
                &[vault_pda_bump_seed],
            ]],
        ),
        // TODO: find a better way of doint it 
        match authority_type {
            0 => AuthorityType::MintTokens,
            1 => AuthorityType::FreezeAccount,
            2 => AuthorityType::AccountOwner,
            3 => AuthorityType::CloseAccount,
            4 => AuthorityType::TransferFeeConfig,
            5 => AuthorityType::WithheldWithdraw,
            6 => AuthorityType::CloseMint,
            7 => AuthorityType::InterestRate,
            8 => AuthorityType::PermanentDelegate,
            9 => AuthorityType::ConfidentialTransferMint,
            10 =>AuthorityType::TransferHookProgramId,
            11 =>AuthorityType::ConfidentialTransferFeeConfig,
            12 =>AuthorityType::MetadataPointer,
            13 =>AuthorityType::GroupPointer,
            14 =>AuthorityType::GroupMemberPointer,
            _ => panic!() // FIXME
        },
        new_authority
    )?;

    Ok(())
}

// TODO: create next wrapper instructions: 
// - freeze
// - thaw
// - burn