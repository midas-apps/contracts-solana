use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;
pub mod utils;
use crate::utils::Validate;
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
        mint_authority_pda: Option<Pubkey>,
    ) -> Result<()> {
        minter_vault::update_minter_vault::handle(
            ctx,
            new_first_deposit_min_m_tokens,
            mint_authority_pda,
        )
    }

    #[access_control(ctx.accounts.validate())]
    pub fn mint_instant(
        ctx: Context<MintInstant>,
        amount_token: u64,
        min_receive_amount: u64,
        referrer_id: [u8; 32],
    ) -> Result<()> {
        minter_vault::mint_instant::handle(ctx, amount_token, min_receive_amount, referrer_id)
    }

    #[access_control(ctx.accounts.validate())]
    pub fn mint_request(
        ctx: Context<MintRequest>,
        amount_token: u64,
        referrer_id: [u8; 32],
    ) -> Result<()> {
        minter_vault::mint_request::handle(ctx, amount_token, referrer_id)
    }

    pub fn approve_mint_request(
        ctx: Context<ApproveMintRequest>,
        request_id: u64,
        new_out_rate: u64,
        is_safe: bool,
    ) -> Result<()> {
        minter_vault::approve_mint_request::handle(ctx, request_id, new_out_rate, is_safe)
    }

    pub fn reject_mint_request(context: Context<RejectMintRequest>, request_id: u64) -> Result<()> {
        minter_vault::reject_mint_request::handle(context, request_id)
    }

    /** Redeemer Vault Instructions */

    pub fn new_redeemer_vault(
        ctx: Context<NewRedeemerVault>,
        min_fiat_redeem_amount: u64,
        fiat_additional_fee: u64,
        fiat_flat_fee: u64,
    ) -> Result<()> {
        redeemer_vault::new_redeemer_vault::handle(
            ctx,
            min_fiat_redeem_amount,
            fiat_additional_fee,
            fiat_flat_fee,
        )
    }

    pub fn update_redeemer_vault(
        ctx: Context<UpdateRedeemerVault>,
        min_fiat_redeem_amount: Option<u64>,
        fiat_additional_fee: Option<u64>,
        fiat_flat_fee: Option<u64>,
    ) -> Result<()> {
        redeemer_vault::update_redeemer_vault::handle(
            ctx,
            min_fiat_redeem_amount,
            fiat_additional_fee,
            fiat_flat_fee,
        )
    }

    #[access_control(ctx.accounts.validate())]
    pub fn redeem_instant(
        ctx: Context<RedeemInstant>,
        amount_m_token: u64,
        min_receive_amount: u64,
    ) -> Result<()> {
        redeemer_vault::redeem_instant::handle(ctx, amount_m_token, min_receive_amount)
    }

    #[access_control(ctx.accounts.validate())]
    pub fn redeem_request(ctx: Context<RedeemRequest>, amount_m_token: u64) -> Result<()> {
        redeemer_vault::redeem_request::handle(ctx, amount_m_token)
    }

    #[access_control(ctx.accounts.validate())]
    pub fn redeem_request_fiat(ctx: Context<RedeemRequestFiat>, amount_m_token: u64) -> Result<()> {
        redeemer_vault::redeem_request_fiat::handle(ctx, amount_m_token)
    }

    pub fn approve_redeem_request(
        ctx: Context<ApproveRedeemRequest>,
        request_id: u64,
        new_m_token_rate: u64,
        is_safe: bool,
    ) -> Result<()> {
        redeemer_vault::approve_redeem_request::handle(ctx, request_id, new_m_token_rate, is_safe)
    }

    pub fn approve_redeem_request_fiat(
        ctx: Context<ApproveRedeemRequestFiat>,
        request_id: u64,
        new_m_token_rate: u64,
        is_safe: bool,
    ) -> Result<()> {
        redeemer_vault::approve_redeem_request_fiat::handle(
            ctx,
            request_id,
            new_m_token_rate,
            is_safe,
        )
    }

    pub fn reject_redeem_request(ctx: Context<RejectRedeemRequest>, request_id: u64) -> Result<()> {
        redeemer_vault::reject_redeem_request::handle(ctx, request_id)
    }

    /** Common Vault Instructions */

    pub fn new_common_vault(
        ctx: Context<NewVaultCommon>,
        ac: Pubkey,
        m_mint: Pubkey,
        m_mint_feed: Pubkey,
        greenlist_enforced: bool,
        ac_role: Pubkey,
        tokens_receiver: Pubkey,
        fee_receiver: Pubkey,
        instant_fee: u64,
        instant_daily_limit: u128,
        variation_tolerance: u64,
        min_amount: u64,
    ) -> Result<()> {
        vault_common::new_vault_common::handle(
            ctx,
            ac,
            m_mint,
            m_mint_feed,
            greenlist_enforced,
            ac_role,
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
        greenlist_enforced: Option<bool>,
        ac_role: Option<Pubkey>,
        tokens_receiver: Option<Pubkey>,
        fee_receiver: Option<Pubkey>,
        instant_fee: Option<u64>,
        instant_daily_limit: Option<u128>,
        variation_tolerance: Option<u64>,
        min_amount: Option<u64>,
    ) -> Result<()> {
        vault_common::update_vault_common::handle(
            ctx,
            greenlist_enforced,
            ac_role,
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
        allowance: u128,
        stable: bool,
    ) -> Result<()> {
        vault_common::add_payment_token::handle(ctx, fee, allowance, stable)
    }

    pub fn add_payment_token_fiat(
        ctx: Context<AddPaymentTokenFiat>,
        fee: u64,
        allowance: u128,
    ) -> Result<()> {
        vault_common::add_payment_token_fiat::handle(ctx, fee, allowance)
    }

    pub fn remove_payment_token(ctx: Context<RemovePaymentToken>, mint: Pubkey) -> Result<()> {
        vault_common::remove_payment_token::handle(ctx, mint)
    }

    pub fn update_payment_token(
        ctx: Context<UpdatePaymentToken>,
        fee: Option<u64>,
        allowance: Option<u128>,
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
        free_from_min_first_mint: Option<bool>,
        waived_fee: Option<bool>,
    ) -> Result<()> {
        vault_common::update_vault_common_account::handle(
            ctx,
            free_from_min_amount,
            free_from_min_first_mint,
            waived_fee,
        )
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
