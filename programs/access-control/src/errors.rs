use anchor_lang::prelude::error_code;

#[error_code]
pub enum AccessControlError {
    #[msg("Not an authority")]
    NotAuthority,
    #[msg("Cannot be both blacklisted and whitelisted")]
    BothBlacklistedAndWhitelisted,
}
