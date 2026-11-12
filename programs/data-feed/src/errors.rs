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
    #[msg("Staleness value exceeds max allowed staleness")]
    ExceedsMaxStaleness,
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
    #[msg("Arithmetic overflow or underflow")]
    ArithmeticOverflow,
    #[msg("Deviation is too high")]
    DeviationTooHigh,
    #[msg("Invalid price timestamp")]
    InvalidPriceTimestamp,
    #[msg("Invalid timestamp")]
    InvalidTimestamp,
    #[msg("Not enough time has passed since last update")]
    NotEnoughTimeHasPassedSinceLastUpdate,
    #[msg("Invalid price")]
    InvalidPrice,
}
