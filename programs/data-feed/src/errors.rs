use anchor_lang::prelude::error_code;

#[error_code]
pub enum DataFeedError {
    #[msg("Invalid underlying feed provided")]
    InvalidFeedProvided,
}
