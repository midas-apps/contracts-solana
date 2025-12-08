use anchor_lang::prelude::error_code;

#[error_code]
pub enum MidasVaultsError {
    #[msg("Not an authority")]
    NotAuthority,
    #[msg("Account is not green listed")]
    NotGreenListed,
    #[msg("Account is black listed")]
    Blacklisted,
    #[msg("Vault is paused")]
    VaultPaused,
    #[msg("Vault instruction is paused")]
    VaultInxPaused,
    #[msg("Amount is less than min.")]
    LessThanMinAmount,
    #[msg("Amount is less than min. for the first mint")]
    LessThanMinAmountFirstMint,
    #[msg("Insufficient allowance for the payment mint")]
    InsufficientAllowance,
    #[msg("Daily limit is exceeded")]
    DailyLimitExceeded,
    #[msg("Variation tolerance exceeded")]
    VariationToleranceExceeded,
    #[msg("Invalid fee value")]
    InvalidFee,
    #[msg("Invalid input amount value")]
    InvalidInAmount,
    #[msg("Invalid output amount value")]
    InvalidOutAmount,
    #[msg("Invalid convert amount value")]
    InvalidConvertAmount,
    #[msg("Invalid rate")]
    InvalidRate,
    #[msg("Output amount is less than min. to receive")]
    LessThanMinReceiveAmount,
    #[msg("Invalid payment mint provided")]
    InvalidPaymentMint,
    #[msg("Invalid seed provided")]
    InvalidSeedProvided,
    #[msg("Invalid vault provided")]
    InvalidVaultProvided,
    #[msg("The new value is the same as the old one")]
    ValueDidntChange,
    #[msg("Max supply cap exceeded")]
    MaxSupplyCapExceeded,
}
