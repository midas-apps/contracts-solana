use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;
pub mod utils;
use instructions::*;

declare_id!("6eFgYZCZZFTe61T4YxWsiHHAunCLTh9V7TAjj8DxuZwm");

#[program]
pub mod midas_vaults {
    use super::*;

    /** Minter Vault Instructions */

    pub fn new_minter_vault(
        ctx: Context<NewMinterVault>,
        first_deposit_min_m_tokens: u64,
    ) -> Result<()> {
        minter_vault::new_minter_vault::handle(ctx, first_deposit_min_m_tokens)
    }

    pub fn update_minter_vault(
        ctx: Context<UpdateMinterVault>,
        new_first_deposit_min_m_tokens: Option<u64>,
    ) -> Result<()> {
        minter_vault::update_minter_vault::handle(ctx, new_first_deposit_min_m_tokens)
    }

    pub fn mint_instant(
        ctx: Context<MintInstant>,
        amount_token: u64,
        min_receive_amount: u64,
        referrer_id: [u8; 32],
    ) -> Result<()> {
        minter_vault::mint_instant::handle(ctx, amount_token, min_receive_amount, referrer_id)
    }

    /** Common Vault Instructions */

    pub fn new_common_vault(
        ctx: Context<NewVaultCommon>,
        ac: Pubkey,
        m_mint: Pubkey,
        m_mint_feed: Pubkey,

        authority: Pubkey,
        tokens_receiver: Pubkey,
        fee_receiver: Pubkey,
        instant_fee: u64,
        instant_daily_limit: u64,
        variation_tolerance: u64,
        min_amount: u64,
    ) -> Result<()> {
        vault_common::new_vault_common::handle(
            ctx,
            ac,
            m_mint,
            m_mint_feed,
            authority,
            tokens_receiver,
            fee_receiver,
            instant_fee,
            instant_daily_limit,
            variation_tolerance,
            min_amount,
        )
    }

    pub fn update_common_vault(
        ctx: Context<UpdateVaultCommon>,
        authority: Option<Pubkey>,
        tokens_receiver: Option<Pubkey>,
        fee_receiver: Option<Pubkey>,
        instant_fee: Option<u64>,
        instant_daily_limit: Option<u64>,
        variation_tolerance: Option<u64>,
        min_amount: Option<u64>,
    ) -> Result<()> {
        vault_common::update_vault_common::handle(
            ctx,
            authority,
            tokens_receiver,
            fee_receiver,
            instant_fee,
            instant_daily_limit,
            variation_tolerance,
            min_amount,
        )
    }

    pub fn add_payment_token(
        ctx: Context<AddPaymentToken>,
        fee: u64,
        allowance: u64,
        stable: bool,
    ) -> Result<()> {
        vault_common::add_payment_token::handle(ctx, fee, allowance, stable)
    }

    pub fn remove_payment_token(ctx: Context<RemovePaymentToken>) -> Result<()> {
        vault_common::remove_payment_token::handle(ctx)
    }

    pub fn update_payment_token(
        ctx: Context<UpdatePaymentToken>,
        fee: Option<u64>,
        allowance: Option<u64>,
        stable: Option<bool>,
    ) -> Result<()> {
        vault_common::update_payment_token::handle(ctx, fee, allowance, stable)
    }

    pub fn new_common_vault_account(ctx: Context<NewVaultCommonAccount>) -> Result<()> {
        vault_common::new_vault_common_account::handle(ctx)
    }

    pub fn update_common_vault_account(
        ctx: Context<UpdateVaultCommonAccount>,
        free_from_min_amount: Option<bool>,
        waived_fee: Option<bool>,
    ) -> Result<()> {
        vault_common::update_vault_common_account::handle(ctx, free_from_min_amount, waived_fee)
    }

    /** Access Control Instructions */

    pub fn new_ac(ctx: Context<NewAccessControl>, authority: Pubkey) -> Result<()> {
        ac::new_ac::handle(ctx, authority)
    }

    pub fn new_account_ac(ctx: Context<NewAccountAccessControl>) -> Result<()> {
        ac::new_account_ac::handle(ctx)
    }

    pub fn update_account_ac(
        ctx: Context<UpdateAccountAccessControl>,
        green_listed: Option<bool>,
        black_listed: Option<bool>,
    ) -> Result<()> {
        ac::update_account_ac::handle(ctx, green_listed, black_listed)
    }

    pub fn set_greenlist_enforced(
        ctx: Context<SetGreenListEnforced>,
        new_value: bool,
    ) -> Result<()> {
        ac::set_greenlist_enforced::handle(ctx, new_value)
    }

    /** Pause Instructions */

    pub fn new_pause_inx(ctx: Context<NewPauseInx>, fn_id: u8) -> Result<()> {
        pause::new_pause_inx::handle(ctx, fn_id)
    }

    pub fn update_pause_inx(ctx: Context<UpdatePauseInx>, fn_id: u8, paused: bool) -> Result<()> {
        pause::update_pause_inx::handle(ctx, fn_id, paused)
    }

    pub fn update_pause(ctx: Context<UpdatePause>, paused: bool) -> Result<()> {
        pause::update_pause::handle(ctx, paused)
    }
}
