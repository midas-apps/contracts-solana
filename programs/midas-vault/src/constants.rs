use anchor_lang::prelude::Pubkey;

pub const FIAT_MINT: Pubkey = Pubkey::new_from_array([0; 32]);
pub const ONE: u64 = 10u64.pow(9);
pub const STABLECOIN_RATE: u64 = ONE;
pub const ONE_HUNDRED_PERCENT: u64 = 100 * 100;
pub const MAX_UINT128: u128 = u128::max_value(); // 18446744073709551615

pub mod seeds {
    pub const VAULT: &[u8; 5] = b"vault";
}
