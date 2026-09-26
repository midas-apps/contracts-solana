use anchor_lang::prelude::*;

use crate::utils::minter;

/* Common Vault Events */
#[event]
pub struct CommonVaultUpdatedEvent {
    /// Common vault account
    pub vault_common: Pubkey,
    /// AccessControl account
    pub ac: Option<Pubkey>,
    /// mToken mint account
    pub m_mint: Option<Pubkey>,
    /// mToken/USD data feed account
    pub m_mint_feed: Option<Pubkey>,
    /// is green list enforced
    pub greenlist_enforced: Option<bool>,
    /// AccessControlRole account
    pub ac_role: Option<Pubkey>,
    /// Tokens receiver
    pub tokens_receiver: Option<Pubkey>,
    /// Fee receiver
    pub fee_receiver: Option<Pubkey>,
    /// Instant fee
    pub instant_fee: Option<u64>,
    /// Instant daily limit
    pub instant_daily_limit: Option<u128>,
    /// Variation tolerance
    pub variation_tolerance: Option<u64>,
    /// Min amount
    pub min_amount: Option<u64>,
}

#[event]
pub struct CommonVaultAccountUpdatedEvent {
    /// Common vault account
    pub common_vault: Pubkey,
    /// Common account owner
    pub account: Pubkey,
    /// Is free from min amount
    pub free_from_min_amount: Option<bool>,
    /// Is free from min first mint
    pub free_from_min_first_mint: Option<bool>,
    /// Is fee waived
    pub waived_fee: Option<bool>,
}

#[event]
pub struct PaymentTokenUpdatedEvent {
    /// Common vault account
    pub common_vault: Pubkey,
    /// Payment mint
    pub mint: Pubkey,
    /// Payment mint USD data feed
    pub data_feed: Option<Pubkey>,
    /// Payment token fee
    pub fee: Option<u64>,
    /// Payment token allowance
    pub allowance: Option<u128>,
    /// Is payment token stable
    pub stable: Option<bool>,
}

#[event]
pub struct PaymentTokenRemovedEvent {
    /// Common vault account
    pub common_vault: Pubkey,
    /// Payment mint
    pub mint: Pubkey,
}

#[event]
pub struct TokensWithdrawnEvent {
    /// Common vault account
    pub common_vault: Pubkey,
    /// SPL mint
    pub mint: Pubkey,
    /// amount of token
    pub amount: u64,
    /// receiver of tokens (not ATA)
    pub receiver: Pubkey,
    /// caller of the instruction
    pub caller: Pubkey,
}

/* Pause Events */

#[event]
pub struct PauseInxUpdatedEvent {
    /// common vault account
    pub common_vault: Pubkey,
    /// function id
    pub fn_id: u8,
    /// is inx was paused or unpaused
    pub paused: bool,
}

#[event]
pub struct PauseUpdatedEvent {
    /// common vault account
    pub common_vault: Pubkey,
    /// is vault was paused or unpaused
    pub paused: bool,
}

/* Minter Vault Events */

#[event]
pub struct MinterVaultUpdatedEvent {
    /// common vault account
    pub common_vault: Pubkey,
    /// min. mTokens for first deposit
    pub first_deposit_min_m_tokens: Option<u64>,
    /// mint authority pda (token-authority program)
    pub mint_authority_pda: Option<Pubkey>,
}

#[event]
pub struct MinterVaultUpdatedEventV2 {
    /// common vault account
    pub common_vault: Pubkey,
    /// min. mTokens for first deposit
    pub first_deposit_min_m_tokens: Option<u64>,
    /// mint authority pda (token-authority program)
    pub mint_authority_pda: Option<Pubkey>,
    /// max supply cap for mToken minting
    pub max_supply_cap: Option<u64>,
}

#[event]
pub struct MinterVaultInstantMintedEvent {
    /// common vault account
    pub common_vault: Pubkey,
    /// inx signer (user)
    pub signer: Pubkey,
    /// payment mint used in inx
    pub payment_mint: Pubkey,
    /// amount of payment mint in base9
    pub payment_amount: u64,
    /// internal minting calculation results
    pub calculated: minter::CalcAndValidateDepositReturn,
    /// referrer id
    pub referrer_id: [u8; 32],
}

#[event]
pub struct MinterVaultRequestCreatedEvent {
    /// common vault account
    pub common_vault: Pubkey,
    /// inx signer (user)
    pub signer: Pubkey,
    /// payment mint used in inx
    pub payment_mint: Pubkey,
    /// amount of payment mint in base9
    pub payment_amount: u64,
    /// generated request id
    pub request_id: u64,
    /// internal minting calculation results
    pub calculated: minter::CalcAndValidateDepositReturn,
    /// referrer id
    pub referrer_id: [u8; 32],
}

#[event]
pub struct MinterVaultRequestApprovedEvent {
    /// common vault account
    pub common_vault: Pubkey,
    /// approved request id
    pub request_id: u64,
    /// mToken rate passed by vault admin
    pub new_out_rate: u64,
}

#[event]
pub struct MinterVaultRequestRejectedEvent {
    /// common vault account
    pub common_vault: Pubkey,
    /// rejected request id
    pub request_id: u64,
}

/* Redeemer Vault Events */
#[event]
pub struct RedeemerVaultUpdatedEvent {
    /// common vault account
    pub common_vault: Pubkey,
    /// min mToken amount for fiat redemption
    pub min_fiat_redeem_amount: Option<u64>,
    /// request redeemer
    pub request_redeemer: Option<Pubkey>,
    /// fiat flat fee
    pub fiat_flat_fee: Option<u64>,
}

#[event]
pub struct RedeemerVaultInstantRedeemedEvent {
    /// common vault account
    pub common_vault: Pubkey,
    /// inx signer (user)
    pub signer: Pubkey,
    /// output payment mint
    pub payment_mint: Pubkey,
    /// amount of mTokens paid
    pub amount_m_token: u64,
    /// amount of mTokens paid in USD
    pub amount_m_token_in_usd: u128,
    /// mToken/USD rate
    pub m_token_rate: u128,
    /// amount `payment_token` included fees
    pub amount_payment_token: u128,
    /// payment_token/USD rate
    pub payment_token_rate: u128,
    /// amount `payment_token` received
    pub amount_payment_token_wo_fee: u128,
    /// payment token decimals
    pub decimals: u8,
    /// fee amount in mToken
    pub fee_amount: u128,
    /// `amount_m_token` - `fee_amount`
    pub m_token_amount_wo_fee: u128,
}

#[event]
pub struct RedeemerVaultRequestCreatedEvent {
    /// common vault account
    pub common_vault: Pubkey,
    /// inx signer (user)
    pub signer: Pubkey,
    /// output payment mint
    pub payment_mint: Pubkey,
    /// generated request id
    pub request_id: u64,
    /// amount of mTokens paid
    pub amount_m_token: u128,
    /// is fiat request
    pub is_fiat: bool,
    /// mToken/USD rate
    pub m_token_rate: u128,
    /// payment_mint/USD rate
    pub payment_mint_rate: u128,
    /// mToken fee
    pub fee_amount: u128,
    /// `amount_m_token` - `fee_amount`
    pub m_token_amount_wo_fee: u128,
}

#[event]
pub struct RedeemerVaultRequestApprovedEvent {
    /// common vault account
    pub common_vault: Pubkey,
    /// generated request id
    pub request_id: u64,
    /// mToken rate passed by vault admin
    pub new_out_rate: u64,
}

#[event]
pub struct RedeemerVaultRequestRejectedEvent {
    /// common vault account
    pub common_vault: Pubkey,
    /// generated request id
    pub request_id: u64,
}
