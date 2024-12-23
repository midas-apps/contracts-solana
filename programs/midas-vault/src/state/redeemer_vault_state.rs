use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
/// Redeemer Vault state definition
/// Contains everything that is only
/// redeem-vault related, everything that can be shared
/// with minter-vault should stay in common-vault
pub struct RedeemerVaultState {
    /// Min mToken amount for a fiat redemption
    pub min_fiat_redeem_amount: u64,
    /// Static amount of mToken that will be added
    /// to calculated fees (only for fiat redemptions)
    pub fiat_flat_fee: u64,
    /// common-vault account
    pub common_vault: Pubkey,
    /// Account from which program will transfer tokens
    /// during requests approval (not ATA)
    pub request_redeemer: Pubkey,
}

impl RedeemerVaultState {
    pub const SEED: &'static [u8; 14] = b"redeemer_vault";
}
