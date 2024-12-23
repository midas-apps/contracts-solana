use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
/// Minter Vault state definition
/// Contains everything that is only
/// minter-vault related, everything that can be shared
/// with redeemer-vault should stay in common-vault
pub struct MinterVaultState {
    /// minimal amount of mTokens that user should
    /// acquire during the first mint
    pub first_deposit_min_m_tokens: u64,
    /// common-vault account
    pub common_vault: Pubkey,
    /// mint authority pda (token-authority program)
    pub mint_authority_pda: Pubkey,
}

impl MinterVaultState {
    pub const SEED: &'static [u8; 12] = b"minter_vault";
}
