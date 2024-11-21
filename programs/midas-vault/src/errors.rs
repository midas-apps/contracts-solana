use anchor_lang::prelude::error_code;

#[error_code]
pub enum MidasVaultsError {
    #[msg("Test")]
    Test,
}
