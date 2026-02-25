use anchor_lang::prelude::Pubkey;

/// Pubkey that indicates that mint in request is fiat
pub const FIAT_MINT: Pubkey = Pubkey::new_from_array([0; 32]);
/// One in base 9
pub const ONE: u64 = 10u64.pow(9);
/// Fixed stablecoin rate for payment mints with stable=true
pub const STABLECOIN_RATE: u64 = ONE;
/// 100% with 2 decimals precision
pub const ONE_HUNDRED_PERCENT: u64 = 100 * 100;
/// Max u128 value
pub const MAX_UINT128: u128 = u128::max_value();
/// Max u64 value
pub const MAX_UINT64: u64 = u64::max_value();

pub mod seeds {
    pub const VAULT: &[u8; 5] = b"vault";
}

pub mod ac_roles {
    /// Holder of this role can manage vaults (update values, approve/reject requests)
    pub const VAULT_ADMIN: &[u8; 16] = b"vault_admin_role";
    /// Holder of this role can pause whole vault or specific instruction
    pub const VAULT_PAUSER: &[u8; 17] = b"vault_pauser_role";
}
