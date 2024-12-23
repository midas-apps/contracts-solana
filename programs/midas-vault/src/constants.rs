use anchor_lang::prelude::Pubkey;

pub const FIAT_MINT: Pubkey = Pubkey::new_from_array([0; 32]);
pub const ONE: u64 = 10u64.pow(9);
pub const STABLECOIN_RATE: u64 = ONE;
pub const ONE_HUNDRED_PERCENT: u64 = 100 * 100;
pub const MAX_UINT128: u128 = u128::max_value(); // 18446744073709551615

pub mod seeds {
    pub const VAULT: &[u8; 5] = b"vault";
}

pub mod ac_roles {
    /// Holder of this role can manage vaults (update values, approve/reject requests)
    pub const VAULT_ADMIN: &[u8; 16] = b"vault_admin_role";
    /// Holder of this role can pause whole vault or specific instruction
    pub const VAULT_PAUSER: &[u8; 17] = b"vault_pauser_role";
}
