use anchor_lang::prelude::error_code;

#[error_code]
pub enum DataFeedError {
    #[msg("Invalid underlying feed provided")]
    InvalidUnderlyingFeedProvided,
    #[msg("Not an authority")]
    NotAuthority,
    #[msg("Data feed price is stale")]
    PriceIsStale,
    #[msg("Invalid staleness value")]
    InvalidStaleness,
    #[msg("Invalid min price value")]
    InvalidMinPrice,
    #[msg("Invalid max price value")]
    InvalidMaxPrice,
    #[msg("Invalid underlying feed")]
    InvalidUnderlyingFeed,
    #[msg("Price is lower than min.")]
    PriceIsLowerThanMin,
    #[msg("Price is higher than max.")]
    PriceIsHigherThanMax,
}
