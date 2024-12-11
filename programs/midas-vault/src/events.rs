use anchor_lang::prelude::*;

use crate::utils::minter;

/* Common Vault Events */
#[event]
pub struct CommonVaultUpdatedEvent {
    pub vault_common: Pubkey,
    pub ac: Option<Pubkey>,
    pub m_mint: Option<Pubkey>,
    pub m_mint_feed: Option<Pubkey>,
    pub greenlist_enforced: Option<bool>,
    pub ac_role: Option<Pubkey>,
    pub tokens_receiver: Option<Pubkey>,
    pub fee_receiver: Option<Pubkey>,
    pub instant_fee: Option<u64>,
    pub instant_daily_limit: Option<u128>,
    pub variation_tolerance: Option<u64>,
    pub min_amount: Option<u64>,
}

#[event]
pub struct CommonVaultAccountUpdatedEvent {
    pub common_vault: Pubkey,
    pub account: Pubkey,
    pub free_from_min_amount: Option<bool>,
    pub free_from_min_first_mint: Option<bool>,
    pub waived_fee: Option<bool>,
}

#[event]
pub struct PaymentTokenUpdatedEvent {
    pub common_vault: Pubkey,
    pub mint: Pubkey,
    pub data_feed: Option<Pubkey>,
    pub fee: Option<u64>,
    pub allowance: Option<u128>,
    pub stable: Option<bool>,
}

#[event]
pub struct PaymentTokenRemovedEvent {
    pub common_vault: Pubkey,
    pub mint: Pubkey,
}

#[event]
pub struct TokensWithdrawnEvent {
    pub common_vault: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub receiver: Pubkey,
    pub caller: Pubkey,
}

/* Pause Events */

#[event]
pub struct PauseInxUpdatedEvent {
    pub common_vault: Pubkey,
    pub fn_id: u8,
    pub paused: bool,
}

#[event]
pub struct PauseUpdatedEvent {
    pub common_vault: Pubkey,
    pub paused: bool,
}

/* Minter Vault Events */

#[event]
pub struct MinterVaultUpdatedEvent {
    pub common_vault: Pubkey,
    pub first_deposit_min_m_tokens: Option<u64>,
    pub mint_authority_pda: Option<Pubkey>,
}

#[event]
pub struct MinterVaultInstantMintedEvent {
    pub common_vault: Pubkey,
    pub signer: Pubkey,
    pub payment_mint: Pubkey,
    pub payment_amount: u64,
    pub calculated: minter::CalcAndValidateDepositReturn,
    pub referrer_id: [u8; 32],
}

#[event]
pub struct MinterVaultRequestCreatedEvent {
    pub common_vault: Pubkey,
    pub signer: Pubkey,
    pub payment_mint: Pubkey,
    pub payment_amount: u64,
    pub request_id: u64,
    pub calculated: minter::CalcAndValidateDepositReturn,
    pub referrer_id: [u8; 32],
}

#[event]
pub struct MinterVaultRequestApprovedEvent {
    pub common_vault: Pubkey,
    pub request_id: u64,
    pub new_out_rate: u64,
}

#[event]
pub struct MinterVaultRequestRejectedEvent {
    pub common_vault: Pubkey,
    pub request_id: u64,
}

/* Redeemer Vault Events */
#[event]
// TODO: add request redeemer
pub struct RedeemerVaultUpdatedEvent {
    pub common_vault: Pubkey,
    pub min_fiat_redeem_amount: Option<u64>,
    pub request_redeemer: Option<Pubkey>,
    pub fiat_flat_fee: Option<u64>,
}

#[event]
pub struct RedeemerVaultInstantRedeemedEvent {
    pub common_vault: Pubkey,
    pub signer: Pubkey,
    pub payment_mint: Pubkey,
    pub amount_m_token: u64,
    pub amount_m_token_in_usd: u128,
    pub m_token_rate: u128,
    pub amount_payment_token: u128,
    pub payment_token_rate: u128,
    pub amount_payment_token_wo_fee: u128,
    pub decimals: u8,
    pub fee_amount: u128,
    pub m_token_amount_wo_fee: u128,
}

#[event]
pub struct RedeemerVaultRequestCreatedEvent {
    pub common_vault: Pubkey,
    pub signer: Pubkey,
    pub payment_mint: Pubkey,
    pub request_id: u64,
    pub amount_m_token: u128,
    pub is_fiat: bool,
    pub m_token_rate: u128,
    pub payment_mint_rate: u128,
    pub fee_amount: u128,
    pub m_token_amount_wo_fee: u128,
}

#[event]
pub struct RedeemerVaultRequestApprovedEvent {
    pub common_vault: Pubkey,
    pub request_id: u64,
    pub new_out_rate: u64,
}

#[event]
pub struct RedeemerVaultRequestRejectedEvent {
    pub common_vault: Pubkey,
    pub request_id: u64,
}
