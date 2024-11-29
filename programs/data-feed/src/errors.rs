use anchor_lang::prelude::error_code;

#[error_code]
pub enum DataFeedError {
    #[msg("Invalid underlying feed provided")]
    InvalidUnderlyingFeedProvided,
    #[msg("Not an authority")]
    NotAuthority,
    #[msg("Data feed price is stale")]
    PriceIsStale,
}
