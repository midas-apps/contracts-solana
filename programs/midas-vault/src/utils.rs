use ::token_authority::cpi::accounts::Mint as AuthorityMint;
use access_control::state::AccountAccessControlState;
use anchor_lang::{prelude::*, solana_program::clock::SECONDS_PER_DAY};

use crate::{
    constants::{FIAT_MINT, MAX_UINT128, ONE, ONE_HUNDRED_PERCENT, STABLECOIN_RATE},
    errors::MidasVaultsError,
    program::MidasVaults,
    state::{
        MintVaultRequestState, MinterVaultState, PauseInxState, PaymentMintState,
        RedeemerVaultRequestState, RedeemerVaultState, VaultCommonAccountState, VaultCommonState,
    },
};
use anchor_spl::{
    token_2022::{burn, transfer_checked, Burn, TransferChecked},
    token_interface::{Mint, TokenAccount, TokenInterface},
};
use data_feed::{state::FeedState, utils::decimals_conversion};

pub enum VaultActionId {
    MintInstant = 0,
    MintRequest,
    RedeemInstant,
    RedeemRequest,
    RedeemRequestFiat,
}

pub trait Closable {
    /// Closes the account
    fn close(&mut self) -> Result<()>;
}

pub trait Validate<'info> {
    /// Validates the account struct.
    fn validate(&self) -> Result<()>;
}

/// Default close account behavior for `Closable::close`
///
/// # Arguments
///
/// - `acc_to_close` - account to close
/// - `receiver` - receiver of sol locked on on account
/// - `system_program` - system program
pub fn close_account(
    acc_to_close: &mut AccountInfo<'_>,
    receiver: &mut AccountInfo<'_>,
    system_program: &Program<System>,
) -> Result<()> {
    let dest_starting_lamports = receiver.lamports();

    let account = acc_to_close.to_account_info();
    **receiver.lamports.borrow_mut() = dest_starting_lamports
        .checked_add(account.lamports())
        .ok_or(MidasVaultsError::ArithmeticOverflow)?;
    **account.lamports.borrow_mut() = 0;

    account.assign(&system_program.key());
    account.resize(0)?;

    Ok(())
}

/// Checks that user is green listed. Skips green_list checks
/// in case if `require_green_list` and `common.greenlist_enforced`
/// are both false
///
/// # Arguments
///
/// - `common` - vault common state
/// - `account_ac` - account access control state
/// - `require_green_list` - if true, then `account_ac.green_listed` must be true
pub fn validate_green_listed(
    common: &VaultCommonState,
    account_ac: &AccountAccessControlState,
    require_green_list: bool,
) -> Result<()> {
    if !require_green_list && !common.greenlist_enforced {
        return Ok(());
    }

    require!(account_ac.green_listed, MidasVaultsError::NotGreenListed);

    Ok(())
}

/// checks that user is black listed
pub fn validate_black_listed(account_ac: &AccountAccessControlState) -> Result<()> {
    require!(!account_ac.black_listed, MidasVaultsError::Blacklisted);

    Ok(())
}

/// checks that vault and calling instruction are not paused
pub fn validate_paused(common: &VaultCommonState, pause_inx: &PauseInxState) -> Result<()> {
    require!(!common.paused, MidasVaultsError::VaultPaused);
    require!(!pause_inx.paused, MidasVaultsError::VaultInxPaused);

    Ok(())
}

/// do several checks:
/// 1. That user is green listed
/// 2. That user is not black listed
/// 3. That vault and instruction are not paused (if pause_inx is Some)
pub fn validate_common(
    common: &VaultCommonState,
    account_ac: &AccountAccessControlState,
    pause_inx: Option<&PauseInxState>,
    require_green_list: bool,
) -> Result<()> {
    validate_green_listed(common, account_ac, require_green_list)?;
    validate_black_listed(account_ac)?;

    if let Some(pause_inx) = pause_inx {
        validate_paused(common, pause_inx)?;
    }

    Ok(())
}

/// Checks that provided `amount` is more than `common.min_amount`
/// but only in case if user is not free from min amount check
/// If minter vault is passed, also does the min firs mint check,
/// but only user wasnt manually freed by vault admin or didnt make
/// any mints before  
pub fn require_and_update_min_amount(
    common: &VaultCommonState,
    common_account: &mut VaultCommonAccountState,
    minter: Option<&MinterVaultState>,
    amount: u128,
) -> Result<()> {
    if common_account.free_from_min_amount {
        return Ok(());
    }

    require_gte!(
        amount,
        common.min_amount as u128,
        MidasVaultsError::LessThanMinAmount
    );

    if let Some(minter) = minter {
        if !common_account.free_from_min_first_mint {
            require_gte!(
                amount,
                minter.first_deposit_min_m_tokens as u128,
                MidasVaultsError::LessThanMinAmountFirstMint,
            );

            common_account.free_from_min_first_mint = true;
        }
    }

    Ok(())
}

/// Updates allowance of a payment mint.
/// In case if allowance is set to `MAX_UINT128` it woul
/// be treated as infinite allowance and wont be updated
pub fn require_and_update_allowance(
    mint_config: &mut PaymentMintState,
    amount: u128,
) -> Result<()> {
    if mint_config.allowance == MAX_UINT128 {
        return Ok(());
    }

    require_gte!(
        mint_config.allowance,
        amount,
        MidasVaultsError::InsufficientAllowance
    );

    mint_config.allowance = mint_config
        .allowance
        .checked_sub(amount)
        .ok_or(MidasVaultsError::ArithmeticOverflow)?;

    Ok(())
}

/// Validates and updates instant daily limit
/// In case if current day is the same as previous
/// recorded, amount will be added to a current recorded limit used.
/// In case if current day is different, it will reset previous
/// recorded limit first
pub fn require_and_update_limit(common: &mut VaultCommonState, amount: u128) -> Result<()> {
    let current_day = get_current_ts()?
        .checked_div(SECONDS_PER_DAY as u32)
        .ok_or(MidasVaultsError::ArithmeticOverflow)?;

    let new_limit_used = if common.instant_last_day == current_day {
        common
            .instant_daily_limit_used
            .checked_add(amount)
            .ok_or(MidasVaultsError::ArithmeticOverflow)?
    } else {
        amount
    };

    require_gte!(
        common.instant_daily_limit,
        new_limit_used,
        MidasVaultsError::DailyLimitExceeded
    );

    common.instant_daily_limit_used = new_limit_used;
    common.instant_last_day = current_day;

    Ok(())
}

/// Checks that the difference between 2 values
/// does not exceed `common.variation_tolerance`
pub fn require_variation_tolerance(
    common: &VaultCommonState,
    price: u128,
    new_price: u128,
) -> Result<()> {
    let price_diff = if new_price >= price {
        new_price
            .checked_sub(price)
            .ok_or(MidasVaultsError::ArithmeticOverflow)?
    } else {
        price
            .checked_sub(new_price)
            .ok_or(MidasVaultsError::ArithmeticOverflow)?
    };

    let price_diff_percent: u64 = price_diff
        .checked_mul(ONE_HUNDRED_PERCENT.into())
        .ok_or(MidasVaultsError::ArithmeticOverflow)?
        .checked_div(price)
        .ok_or(MidasVaultsError::ArithmeticOverflow)?
        .try_into()
        .map_err(|_| MidasVaultsError::ArithmeticOverflow)?;

    require_gte!(
        common.variation_tolerance,
        price_diff_percent,
        MidasVaultsError::VariationToleranceExceeded
    );

    Ok(())
}

/// Validates that minting `mint_amount` tokens would not exceed `max_supply_cap`.
/// To disable the cap (unlimited), set `max_supply_cap` to `u64::MAX`.
pub fn validate_max_supply_cap(
    m_mint: &Mint,
    minter: &MinterVaultState,
    mint_amount: u64,
) -> Result<bool> {
    validate_max_supply_cap_with_supply(m_mint.supply, minter, mint_amount)
}

/// Inner logic for max supply cap check
pub(crate) fn validate_max_supply_cap_with_supply(
    current_supply: u64,
    minter: &MinterVaultState,
    mint_amount: u64,
) -> Result<bool> {
    let new_supply = current_supply
        .checked_add(mint_amount)
        .ok_or(MidasVaultsError::ArithmeticOverflow)?;
    Ok(minter.max_supply_cap >= new_supply)
}

/// Calculates fee for a given amount
///
/// # Arguments
///
/// - `mint_config` - payment mint state
/// - `common` - vault common state
/// - `account_common` - vault common account state
/// - `amount` - amount to calculate fee for
/// - `is_instant` - if true, instant fee will be added
pub fn get_fee_amount(
    mint_config: &PaymentMintState,
    common: &VaultCommonState,
    account_common: &VaultCommonAccountState,
    amount: u128,
    is_instant: bool,
) -> Result<u128> {
    if account_common.waived_fee {
        return Ok(0);
    }

    let mut fee_percent = mint_config.fee.into();

    if is_instant {
        fee_percent += common.instant_fee as u128;
    }

    if fee_percent > ONE_HUNDRED_PERCENT.into() {
        fee_percent = ONE_HUNDRED_PERCENT.into();
    }

    Ok(amount
        .checked_mul(fee_percent)
        .ok_or(MidasVaultsError::ArithmeticOverflow)?
        .checked_div(ONE_HUNDRED_PERCENT.into())
        .ok_or(MidasVaultsError::ArithmeticOverflow)?)
}

/// Gets token rate from a data feed.
/// In case if `stable` is true, it will return `STABLECOIN_RATE`
///
/// # Arguments
///
/// - `data_feed` - data feed state
/// - `feed` - data feed account
/// - `stable` - if true, `STABLECOIN_RATE` will be returned
pub fn get_token_rate(data_feed: &FeedState, feed: &AccountInfo<'_>, stable: bool) -> Result<u128> {
    let price = data_feed.get_price_in_base_9(feed)?;

    if stable {
        return Ok(STABLECOIN_RATE.into());
    }

    Ok(price)
}
/// Validates that fee does not exceed 100%.
/// In case if check_min is true, it will also check that fee is more than 0
pub fn validate_fee(fee: u64, check_min: bool) -> Result<()> {
    require_gte!(ONE_HUNDRED_PERCENT, fee, MidasVaultsError::InvalidFee);

    if check_min {
        require_gt!(fee, 0, MidasVaultsError::InvalidFee);
    }

    Ok(())
}

/// Does SPL transfer. Requires that `authority` is a signer.
///
/// # Arguments
///
/// - `token_program` - SPL token program
/// - `mint` - SPL mint account (`TransferChecked::mint`)
/// - `authority` - `TransferChecked::authority`
/// - `from` - `TransferChecked::from`
/// - `to` - `TransferChecked::to`
/// - `amount_base9` - amount to transfer in with 9 decimals
pub fn transfer_token<'info>(
    token_program: &Interface<'info, TokenInterface>,
    mint: &Box<InterfaceAccount<'info, Mint>>,
    authority: &AccountInfo<'info>,
    from: &Box<InterfaceAccount<'info, TokenAccount>>,
    to: &Box<InterfaceAccount<'info, TokenAccount>>,
    amount_base9: u128,
) -> Result<()> {
    let amount: u64 =
        decimals_conversion::convert_from_base_9(amount_base9, mint.decimals)?.try_into()?;

    transfer_checked(
        CpiContext::new(
            token_program.to_account_info(),
            TransferChecked {
                authority: authority.to_account_info(),
                mint: mint.to_account_info(),
                from: from.to_account_info(),
                to: to.to_account_info(),
            },
        ),
        amount,
        mint.decimals,
    )?;

    Ok(())
}

/// Does SPL transfer using vault common as a signer.
///
/// # Arguments
///
/// - `vault_common` - vault common state
/// - `vault_seed` - vault seed
/// - `token_program` - SPL token program
/// - `mint` - SPL mint account (`TransferChecked::mint`)
/// - `authority` - `TransferChecked::authority`
/// - `from` - `TransferChecked::from`
/// - `to` - `TransferChecked::to`
/// - `amount_base9` - amount to transfer in with 9 decimals
pub fn transfer_token_with_signer<'info>(
    vault_common: &Pubkey,
    vault_seed: &[u8],
    token_program: &Interface<'info, TokenInterface>,
    mint: &Box<InterfaceAccount<'info, Mint>>,
    authority: &AccountInfo<'info>,
    from: &Box<InterfaceAccount<'info, TokenAccount>>,
    to: &Box<InterfaceAccount<'info, TokenAccount>>,
    amount_base9: u128,
) -> Result<()> {
    let (_, vault_pda_bump_seed) =
        Pubkey::find_program_address(&[vault_seed, vault_common.as_ref()], &MidasVaults::id());

    let amount: u64 =
        decimals_conversion::convert_from_base_9(amount_base9, mint.decimals)?.try_into()?;

    transfer_checked(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            TransferChecked {
                authority: authority.to_account_info(),
                mint: mint.to_account_info(),
                from: from.to_account_info(),
                to: to.to_account_info(),
            },
            &[&[vault_seed, vault_common.as_ref(), &[vault_pda_bump_seed]]],
        ),
        amount,
        mint.decimals,
    )?;

    Ok(())
}

/// Does SPL mint using vault common as a signer.
/// The minting is done through token-authority program.
///
/// # Arguments
///
/// - `common_vault` - common vault state
/// - `authority` - `AuthorityMint::authority`
/// - `receiver` - `AuthorityMint::receiver`
/// - `token_authority` - `AuthorityMint::token_authority`
/// - `authority_minter_role` - `AuthorityMint::authority_minter_role`
/// - `mint` - `AuthorityMint::mint`
/// - `receiver_ata` - `AuthorityMint::receiver_ata`
/// - `token_program` - SPL token program
/// - `system_program` - system program
/// - `token_authority_program` - token authority program
/// - `amount` - amount to mint (in base 9)
pub fn mint_token<'info>(
    common_vault: &Pubkey,
    authority: &AccountInfo<'info>,
    receiver: &AccountInfo<'info>,
    token_authority: &AccountInfo<'info>,
    authority_minter_role: &AccountInfo<'info>,
    mint: &AccountInfo<'info>,
    receiver_ata: &AccountInfo<'info>,
    token_program: &AccountInfo<'info>,
    system_program: &AccountInfo<'info>,
    token_authority_program: &AccountInfo<'info>,
    amount: u64,
) -> Result<()> {
    let (_, vault_pda_bump_seed) = Pubkey::find_program_address(
        &[MinterVaultState::SEED, common_vault.as_ref()],
        &MidasVaults::id(),
    );

    let accounts = AuthorityMint {
        authority: authority.clone(),
        receiver: receiver.clone(),
        token_authority: token_authority.clone(),
        authority_minter_role: authority_minter_role.clone(),
        mint: mint.clone(),
        receiver_ata: receiver_ata.clone(),
        token_program: token_program.clone(),
        system_program: system_program.clone(),
    };

    ::token_authority::cpi::mint(
        CpiContext::new_with_signer(
            token_authority_program.clone(),
            accounts,
            &[&[
                MinterVaultState::SEED,
                common_vault.as_ref(),
                &[vault_pda_bump_seed],
            ]],
        ),
        amount,
    )?;

    Ok(())
}

/// Burns mToken. Requires that `authority` is a signer.
///
/// # Arguments
///
/// - `token_program` - SPL token program
/// - `mint` - SPL mint account (`Burn::mint`)
/// - `authority` - `Burn::authority`
/// - `from` - `Burn::from`
/// - `amount` - amount to burn (in base 9)
pub fn burn_mtoken<'info>(
    token_program: &Interface<'info, TokenInterface>,
    mint: &Box<InterfaceAccount<'info, Mint>>,
    authority: &AccountInfo<'info>,
    from: &Box<InterfaceAccount<'info, TokenAccount>>,
    amount: u128,
) -> Result<()> {
    burn(
        CpiContext::new(
            token_program.to_account_info(),
            Burn {
                authority: authority.to_account_info(),
                mint: mint.to_account_info(),
                from: from.to_account_info(),
            },
        ),
        amount.try_into().unwrap(),
    )?;

    Ok(())
}

/// Burns mToken using vault common as a signer.
///
/// # Arguments
///
/// - `vault_common` - vault common state
/// - `token_program` - SPL token program
/// - `mint` - SPL mint account (`Burn::mint`)
/// - `authority` - `Burn::authority`
/// - `from` - `Burn::from`
/// - `amount` - amount to burn (in base 9)
pub fn burn_mtoken_with_signer<'info>(
    vault_common: &Pubkey,
    token_program: &Interface<'info, TokenInterface>,
    mint: &Box<InterfaceAccount<'info, Mint>>,
    authority: &AccountInfo<'info>,
    from: &Box<InterfaceAccount<'info, TokenAccount>>,
    amount: u128,
) -> Result<()> {
    let (_, vault_pda_bump_seed) = Pubkey::find_program_address(
        &[RedeemerVaultState::SEED, vault_common.as_ref()],
        &MidasVaults::id(),
    );

    burn(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            Burn {
                authority: authority.to_account_info(),
                mint: mint.to_account_info(),
                from: from.to_account_info(),
            },
            &[&[
                RedeemerVaultState::SEED,
                vault_common.as_ref(),
                &[vault_pda_bump_seed],
            ]],
        ),
        amount.try_into().unwrap(),
    )?;

    Ok(())
}

/// Contains utils and helpers for minter vault
pub mod minter {
    use access_control::state::AccountAccessControlRoleState;
    use token_authority::{program::TokenAuthority, state::TokenAuthorityState};

    use super::*;
    use crate::events::MinterVaultRequestApprovedEvent;

    #[derive(AnchorDeserialize, AnchorSerialize)]
    /// Return type for `calc_and_validate_deposit`
    pub struct CalcAndValidateDepositReturn {
        /// How much of mToken to mint in USD
        pub mint_amount_in_usd: u128,
        /// Fee amount in payment token
        pub fee_token_amount: u128,
        /// Original payment token amount without fee
        pub amount_token_wo_fee: u128,
        /// How much of mToken to mint
        pub m_token_amount: u128,
        /// Payment mint rate
        pub mint_in_rate: u128,
        /// mToken rate
        pub m_token_rate: u128,
        /// Payment mint decimals
        pub decimals: u8,
        /// Deposited amount in USD exluding all fees
        pub deposited_usd: u128,
    }

    /// Calculates shared parameters for instant and request mints.
    /// Also does shared checks like check for min amounts, daily limits
    /// and payment allowance
    pub fn calc_and_validate_deposit(
        payment_mint: &Box<InterfaceAccount<'_, Mint>>,
        payment_mint_data_feed: &FeedState,
        payment_mint_feed: &AccountInfo<'_>,
        m_data_feed: &FeedState,
        m_feed: &AccountInfo<'_>,
        mint_config: &mut PaymentMintState,
        common: &VaultCommonState,
        common_account: &mut VaultCommonAccountState,
        minter: &mut MinterVaultState,
        payment_amount: u128,
        is_instant: bool,
    ) -> Result<CalcAndValidateDepositReturn> {
        require_gt!(payment_amount, 0, MidasVaultsError::InvalidInAmount);

        let decimals = payment_mint.decimals;

        let (mint_amount_in_usd, mint_in_rate) = convert_payment_mint_to_usd(
            mint_config,
            payment_mint_data_feed,
            payment_mint_feed,
            payment_amount,
        )
        .unwrap();

        require_and_update_allowance(mint_config, payment_amount)?;

        let fee_token_amount = truncate(
            get_fee_amount(
                mint_config,
                common,
                common_account,
                payment_amount,
                is_instant,
            )?,
            decimals,
        )?;

        let amount_token_wo_fee = payment_amount
            .checked_sub(fee_token_amount)
            .ok_or(MidasVaultsError::ArithmeticOverflow)?;

        let fee_in_usd = (fee_token_amount.checked_mul(mint_in_rate))
            .ok_or(MidasVaultsError::ArithmeticOverflow)?
            .checked_div(ONE.into())
            .ok_or(MidasVaultsError::ArithmeticOverflow)?;

        let deposited_usd = mint_amount_in_usd
            .checked_sub(fee_in_usd)
            .ok_or(MidasVaultsError::ArithmeticOverflow)?;

        let (m_token_amount, m_token_rate) =
            convert_usd_to_m_token(m_data_feed, m_feed, deposited_usd)?;

        require_and_update_min_amount(common, common_account, Some(minter), m_token_amount)?;

        require_gt!(m_token_amount, 0, MidasVaultsError::InvalidOutAmount);

        Ok(CalcAndValidateDepositReturn {
            mint_amount_in_usd,
            fee_token_amount,
            amount_token_wo_fee,
            m_token_amount,
            mint_in_rate,
            m_token_rate,
            decimals,
            deposited_usd,
        })
    }

    /// Converts payment mint to USD by using rate from a data feed
    /// Requires that `amount` is more than 0 and rate is more than 0
    pub fn convert_payment_mint_to_usd(
        payment_mint_state: &PaymentMintState,
        data_feed: &FeedState,
        feed: &AccountInfo<'_>,
        amount: u128,
    ) -> Result<(u128, u128)> {
        require_gt!(amount, 0, MidasVaultsError::InvalidConvertAmount);

        let rate = get_token_rate(data_feed, feed, payment_mint_state.stable)?;
        require_gt!(rate, 0, MidasVaultsError::InvalidRate);

        Ok((
            amount
                .checked_mul(rate)
                .ok_or(MidasVaultsError::ArithmeticOverflow)?
                .checked_div(ONE.into())
                .ok_or(MidasVaultsError::ArithmeticOverflow)?,
            rate,
        ))
    }

    /// Converts USD to mToken by using rate from a data feed
    /// Requires that `amount` is more than 0 and rate is more than 0
    pub fn convert_usd_to_m_token(
        data_feed: &FeedState,
        feed: &AccountInfo<'_>,
        amount: u128,
    ) -> Result<(u128, u128)> {
        require_gt!(amount, 0, MidasVaultsError::InvalidConvertAmount);

        let rate = get_token_rate(data_feed, feed, false)?;
        require_gt!(rate, 0, MidasVaultsError::InvalidRate);

        Ok((
            amount
                .checked_mul(ONE.into())
                .ok_or(MidasVaultsError::ArithmeticOverflow)?
                .checked_div(rate)
                .ok_or(MidasVaultsError::ArithmeticOverflow)?,
            rate,
        ))
    }

    // Approves mint request. Returns Ok(true) on success, Ok(false) if skipped.
    pub fn approve_mint_request<'info>(
        request: &MintVaultRequestState,
        account_ac: &AccountAccessControlState,
        vault_common: &Account<'info, VaultCommonState>,
        minter_vault: &Account<'info, MinterVaultState>,
        m_mint: &Box<InterfaceAccount<'info, Mint>>,
        m_mint_user_ata: &Box<InterfaceAccount<'info, TokenAccount>>,
        m_mint_token_program: &Interface<'info, TokenInterface>,
        user_account: &AccountInfo<'info>,
        token_authority: &Account<'info, TokenAuthorityState>,
        vault_minter_role: &Account<'info, AccountAccessControlRoleState>,
        system_program: &Program<'info, System>,
        token_authority_program: &Program<'info, TokenAuthority>,
        request_id: u64,
        new_out_rate: u128,
        is_safe: bool,
        skip_on_supply_cap_exceeded: bool,
    ) -> Result<bool> {
        validate_common(&vault_common, &account_ac, None, false)?;

        if is_safe {
            require_variation_tolerance(vault_common, request.m_mint_rate.into(), new_out_rate)?;
        }

        let amount_to_mint = (request.deposited_usd_wo_fees as u128)
            .checked_mul(ONE.into())
            .ok_or(MidasVaultsError::ArithmeticOverflow)?
            .checked_div(new_out_rate)
            .ok_or(MidasVaultsError::ArithmeticOverflow)?;

        if !validate_max_supply_cap(m_mint, minter_vault, amount_to_mint.try_into().unwrap())? {
            if skip_on_supply_cap_exceeded {
                return Ok(false);
            }
            return Err(MidasVaultsError::MaxSupplyCapExceeded.into());
        }

        mint_token(
            &vault_common.key(),
            &minter_vault.to_account_info(),
            user_account,
            &token_authority.to_account_info(),
            &vault_minter_role.to_account_info(),
            &m_mint.to_account_info(),
            &m_mint_user_ata.to_account_info(),
            &m_mint_token_program.to_account_info(),
            &system_program.to_account_info(),
            &token_authority_program.to_account_info(),
            amount_to_mint.try_into().unwrap(),
        )?;

        emit!(MinterVaultRequestApprovedEvent {
            common_vault: vault_common.key(),
            new_out_rate: new_out_rate
                .try_into()
                .map_err(|_| MidasVaultsError::ArithmeticOverflow)?,
            request_id
        });

        Ok(true)
    }
}

pub mod common_vault {
    use crate::events::PaymentTokenUpdatedEvent;

    use super::*;

    /// Updates payment token state with new values
    /// If parameter is None, it will not be updated
    pub fn update_payment_token(
        common_vault: &Pubkey,
        payment_mint_state: &mut PaymentMintState,
        mint: &Pubkey,
        data_feed: &Option<Pubkey>,
        fee: Option<u64>,
        allowance: Option<u128>,
        stable: Option<bool>,
    ) -> Result<()> {
        payment_mint_state.mint = mint.key();

        if let Some(data_feed) = data_feed {
            payment_mint_state.data_feed = data_feed.key();
        }

        if let Some(fee) = fee {
            validate_fee(fee, false)?;
            payment_mint_state.fee = fee;
        }

        if let Some(allowance) = allowance {
            payment_mint_state.allowance = allowance;
        }

        if let Some(stable) = stable {
            payment_mint_state.stable = stable;
        }

        emit!(PaymentTokenUpdatedEvent {
            allowance,
            stable,
            data_feed: *data_feed,
            fee,
            common_vault: *common_vault,
            mint: *mint
        });

        Ok(())
    }

    /// Updates common vault state with new values
    /// If parameter is None, it will not be updated
    pub fn update_common_vault(
        state: &mut VaultCommonState,
        greenlist_enforced: Option<bool>,
        ac_role: Option<Pubkey>,
        tokens_receiver: Option<Pubkey>,
        fee_receiver: Option<Pubkey>,
        instant_fee: Option<u64>,
        instant_daily_limit: Option<u128>,
        variation_tolerance: Option<u64>,
        min_amount: Option<u64>,
    ) -> Result<()> {
        if let Some(greenlist_enforced) = greenlist_enforced {
            state.greenlist_enforced = greenlist_enforced;
        }

        if let Some(ac_role) = ac_role {
            state.ac_role = ac_role;
        }

        if let Some(tokens_receiver) = tokens_receiver {
            state.tokens_receiver = tokens_receiver;
        }

        if let Some(fee_receiver) = fee_receiver {
            state.fee_receiver = fee_receiver;
        }

        if let Some(instant_fee) = instant_fee {
            validate_fee(instant_fee, false)?;
            state.instant_fee = instant_fee;
        }

        if let Some(instant_daily_limit) = instant_daily_limit {
            state.instant_daily_limit = instant_daily_limit;
        }

        if let Some(variation_tolerance) = variation_tolerance {
            validate_fee(variation_tolerance, true)?;
            state.variation_tolerance = variation_tolerance;
        }

        if let Some(min_amount) = min_amount {
            state.min_amount = min_amount;
        }

        Ok(())
    }
}

pub mod redeemer {

    use crate::events::{
        RedeemerVaultRequestApprovedEvent, RedeemerVaultRequestCreatedEvent,
        RedeemerVaultUpdatedEvent,
    };

    use super::*;

    /// Return type for `calc_and_validate_redeem`
    pub struct CalcAndValidateRedeemReturn {
        /// Calculated fee amount in mToken
        pub fee_amount: u128,
        /// Original mToken amount without fee
        pub m_token_amount_wo_fee: u128,
    }

    /// Updates redeemer vault state with new values
    /// If parameter is None, it will not be updated
    pub fn update_redeemer<'info>(
        common_vault: &Pubkey,
        vault: &mut Account<'info, RedeemerVaultState>,
        request_redeemer: Option<Pubkey>,
        min_fiat_redeem_amount: Option<u64>,
        fiat_flat_fee: Option<u64>,
    ) -> Result<()> {
        vault.common_vault = *common_vault;

        if let Some(min_fiat_redeem_amount) = min_fiat_redeem_amount {
            vault.min_fiat_redeem_amount = min_fiat_redeem_amount;
        }

        if let Some(fiat_flat_fee) = fiat_flat_fee {
            vault.fiat_flat_fee = fiat_flat_fee;
        }

        if let Some(request_redeemer) = request_redeemer {
            vault.request_redeemer = request_redeemer;
        }

        emit!(RedeemerVaultUpdatedEvent {
            common_vault: *common_vault,
            fiat_flat_fee,
            request_redeemer,
            min_fiat_redeem_amount
        });

        Ok(())
    }

    /// Creates redeem request. Moved to utils as the creation
    /// logic is the same for fiat and not-fiat requests
    pub fn create_redeem_request<'info>(
        signer: &Signer<'info>,
        vault_common: &mut Account<'info, VaultCommonState>,
        vault_common_signer: &mut Account<'info, VaultCommonAccountState>,
        redeemer_vault: &mut Account<'info, RedeemerVaultState>,
        payment_mint_state: &mut Account<'info, PaymentMintState>,
        payment_mint: &Pubkey,
        payment_mint_data_feed: Option<&Account<'info, FeedState>>,
        payment_mint_feed: Option<&AccountInfo<'info>>,
        m_mint: &Box<InterfaceAccount<'info, Mint>>,
        m_mint_token_program: &Interface<'info, TokenInterface>,
        m_mint_data_feed: &Account<'info, FeedState>,
        m_mint_feed: &AccountInfo<'info>,
        m_mint_signer_ata: &Box<InterfaceAccount<'info, TokenAccount>>,
        m_mint_vault_ata: &Box<InterfaceAccount<'info, TokenAccount>>,
        m_mint_fee_receiver_ata: &Box<InterfaceAccount<'info, TokenAccount>>,
        redeem_request: &mut Account<'info, RedeemerVaultRequestState>,
        amount_m_token: u128,
        is_fiat: bool,
    ) -> Result<()> {
        let params = redeemer::calc_and_validate_redeem(
            payment_mint_state,
            vault_common,
            vault_common_signer,
            redeemer_vault,
            amount_m_token,
            false,
            is_fiat,
        )?;

        let payment_mint_rate = if !is_fiat {
            get_token_rate(
                payment_mint_data_feed.unwrap(),
                payment_mint_feed.unwrap(),
                payment_mint_state.stable,
            )?
        } else {
            ONE as u128
        };

        let m_token_rate = get_token_rate(m_mint_data_feed, m_mint_feed, false)?;

        transfer_token(
            m_mint_token_program,
            m_mint,
            &signer.to_account_info(),
            m_mint_signer_ata,
            m_mint_vault_ata,
            params.m_token_amount_wo_fee,
        )?;

        if params.fee_amount > 0 {
            transfer_token(
                m_mint_token_program,
                m_mint,
                &signer.to_account_info(),
                m_mint_signer_ata,
                m_mint_fee_receiver_ata,
                params.fee_amount,
            )?;
        }

        redeem_request.user = signer.key();
        redeem_request.payment_mint = payment_mint.key();
        redeem_request.m_token_amount = params.m_token_amount_wo_fee.try_into().unwrap();
        redeem_request.m_token_rate = m_token_rate.try_into().unwrap();
        redeem_request.payment_mint_rate = payment_mint_rate.try_into().unwrap();

        let request_id = vault_common.requests_count;

        vault_common.requests_count = request_id
            .checked_add(1)
            .ok_or(MidasVaultsError::ArithmeticOverflow)?;

        emit!(RedeemerVaultRequestCreatedEvent {
            amount_m_token,
            request_id,
            common_vault: vault_common.key(),
            payment_mint: payment_mint.key(),
            signer: signer.key(),
            is_fiat,
            m_token_rate,
            payment_mint_rate,
            fee_amount: params.fee_amount,
            m_token_amount_wo_fee: params.m_token_amount_wo_fee,
        });

        Ok(())
    }

    /// Validates that requestRedeemer has sufficient balance for the transfer.
    pub fn validate_liquidity(
        redeemer_ata: &Box<InterfaceAccount<'_, TokenAccount>>,
        payment_mint: &Box<InterfaceAccount<'_, Mint>>,
        amount_base9: u128,
    ) -> bool {
        let transfer_amount: u64 =
            match decimals_conversion::convert_from_base_9(amount_base9, payment_mint.decimals) {
                Ok(v) => match v.try_into() {
                    Ok(amount) => amount,
                    Err(_) => return false,
                },
                Err(_) => return false,
            };

        redeemer_ata.amount >= transfer_amount
    }

    /// Approves redeem request. Returns Ok(true) on success, Ok(false) if skipped.
    pub fn approve_redeem_request<'info>(
        request: &RedeemerVaultRequestState,
        account_ac: &AccountAccessControlState,
        vault_common: &Account<'info, VaultCommonState>,
        redeemer_vault: &Account<'info, RedeemerVaultState>,
        m_mint_token_program: &Interface<'info, TokenInterface>,
        m_mint: &Box<InterfaceAccount<'info, Mint>>,
        m_mint_vault_ata: &Box<InterfaceAccount<'info, TokenAccount>>,
        payment_mint_state: &mut PaymentMintState,

        payment_mint: Option<&Box<InterfaceAccount<'info, Mint>>>,
        payment_mint_token_program: Option<&Interface<'info, TokenInterface>>,
        payment_mint_redeemer_ata: Option<&Box<InterfaceAccount<'info, TokenAccount>>>,
        payment_mint_user_ata: Option<&Box<InterfaceAccount<'info, TokenAccount>>>,

        request_id: u64,
        new_m_token_rate: u128,
        is_safe: bool,
        safe_validate_liquidity: bool,
    ) -> Result<bool> {
        let (expected_mint_key, is_fiat) = if let Some(payment_mint) = payment_mint {
            (payment_mint.key(), false)
        } else {
            (FIAT_MINT, true)
        };

        validate_common(vault_common, account_ac, None, is_fiat)?;

        require_keys_eq!(
            expected_mint_key,
            request.payment_mint,
            MidasVaultsError::InvalidPaymentMint
        );

        if is_safe {
            require_variation_tolerance(
                vault_common,
                request.m_token_rate.into(),
                new_m_token_rate,
            )?;
        }

        let decimals = if let Some(payment_mint) = payment_mint {
            payment_mint.decimals
        } else {
            9
        };

        let amount_token_wo_fee = truncate(
            (request.m_token_amount as u128)
                .checked_mul(new_m_token_rate)
                .ok_or(MidasVaultsError::ArithmeticOverflow)?
                .checked_div(request.payment_mint_rate.into())
                .ok_or(MidasVaultsError::ArithmeticOverflow)?,
            decimals,
        )?;

        if !is_fiat {
            if safe_validate_liquidity
                && !validate_liquidity(
                    payment_mint_redeemer_ata.unwrap(),
                    payment_mint.unwrap(),
                    amount_token_wo_fee,
                )
            {
                return Ok(false);
            }

            transfer_token_with_signer(
                &vault_common.key(),
                RedeemerVaultState::SEED,
                payment_mint_token_program.unwrap(),
                payment_mint.unwrap(),
                &redeemer_vault.to_account_info(),
                payment_mint_redeemer_ata.unwrap(),
                payment_mint_user_ata.unwrap(),
                amount_token_wo_fee,
            )?;
        }

        require_and_update_allowance(payment_mint_state, amount_token_wo_fee)?;

        burn_mtoken_with_signer(
            &vault_common.key(),
            m_mint_token_program,
            m_mint,
            &redeemer_vault.to_account_info(),
            m_mint_vault_ata,
            request.m_token_amount.into(),
        )?;

        emit!(RedeemerVaultRequestApprovedEvent {
            request_id,
            common_vault: vault_common.key(),
            new_out_rate: new_m_token_rate
                .try_into()
                .map_err(|_| MidasVaultsError::ArithmeticOverflow)?,
        });
        Ok(true)
    }

    /// Calculates shared parameters for instant and redeem redeems.
    /// Also does shared checks like min amount check
    pub fn calc_and_validate_redeem(
        mint_config: &PaymentMintState,
        common: &VaultCommonState,
        common_account: &VaultCommonAccountState,
        redeemer: &RedeemerVaultState,

        m_token_amount: u128,
        is_instant: bool,
        is_fiat: bool,
    ) -> Result<CalcAndValidateRedeemReturn> {
        require_gt!(m_token_amount, 0, MidasVaultsError::InvalidInAmount);

        if !common_account.free_from_min_amount {
            let min_redeem_amount: u128 = if is_fiat {
                redeemer.min_fiat_redeem_amount.into()
            } else {
                common.min_amount.into()
            };

            require_gte!(
                m_token_amount,
                min_redeem_amount,
                MidasVaultsError::LessThanMinAmount
            );
        }

        let mut fee_amount = get_fee_amount(
            mint_config,
            common,
            common_account,
            m_token_amount,
            is_instant,
        )?;

        if is_fiat && !common_account.waived_fee {
            fee_amount += redeemer.fiat_flat_fee as u128;
        }

        require_gt!(
            m_token_amount,
            fee_amount,
            MidasVaultsError::InvalidOutAmount
        );

        Ok(CalcAndValidateRedeemReturn {
            fee_amount,
            m_token_amount_wo_fee: m_token_amount
                .checked_sub(fee_amount)
                .ok_or(MidasVaultsError::ArithmeticOverflow)?,
        })
    }

    /// Converts payment mint to USD by using rate from a data feed
    /// Requires that `amount` is more than 0 and rate is more than 0
    pub fn convert_usd_to_payment_mint(
        payment_mint_state: &PaymentMintState,
        data_feed: &FeedState,
        feed: &AccountInfo<'_>,
        amount: u128,
    ) -> Result<(u128, u128)> {
        require_gt!(amount, 0, MidasVaultsError::InvalidConvertAmount);

        let rate = get_token_rate(data_feed, feed, payment_mint_state.stable)?;
        require_gt!(rate, 0, MidasVaultsError::InvalidRate);

        Ok((
            amount
                .checked_mul(ONE.into())
                .ok_or(MidasVaultsError::ArithmeticOverflow)?
                .checked_div(rate)
                .ok_or(MidasVaultsError::ArithmeticOverflow)?,
            rate,
        ))
    }

    /// Converts mToken to USD by using rate from a data feed
    /// Requires that `amount` is more than 0 and rate is more than 0
    pub fn convert_m_token_to_usd(
        data_feed: &FeedState,
        feed: &AccountInfo<'_>,
        amount: u128,
    ) -> Result<(u128, u128)> {
        require_gt!(amount, 0, MidasVaultsError::InvalidConvertAmount);

        let rate = get_token_rate(data_feed, feed, false)?;
        require_gt!(rate, 0, MidasVaultsError::InvalidRate);

        Ok((
            amount
                .checked_mul(rate)
                .ok_or(MidasVaultsError::ArithmeticOverflow)?
                .checked_div(ONE.into())
                .ok_or(MidasVaultsError::ArithmeticOverflow)?,
            rate,
        ))
    }
}

/// Returns current unix timestamp from the clock
pub fn get_current_ts() -> Result<u32> {
    Ok(Clock::get()
        .unwrap()
        .unix_timestamp
        .try_into()
        .map_err(|_| MidasVaultsError::ArithmeticOverflow)?)
}

/// Truncates value to a given number of decimals and returns
/// the result in base 9
///
/// Example:
///
/// let value = 123456789;
/// let decimals = 6;
///
/// let truncated = truncate(value, decimals).unwrap();
///
/// assert_eq!(truncated, 123456000);
///
///
/// # Returns
///
/// Truncated value in base 9
///
pub fn truncate(value: u128, decimals: u8) -> Result<u128> {
    decimals_conversion::convert_to_base_9(
        decimals_conversion::convert_from_base_9(value, decimals)?,
        decimals,
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::prelude::Pubkey;
    fn default_pubkey() -> Pubkey {
        Pubkey::new_from_array([0u8; 32])
    }

    fn vault_common(
        paused: bool,
        greenlist_enforced: bool,
        variation_tolerance: u64,
        instant_fee: u64,
    ) -> VaultCommonState {
        VaultCommonState {
            ac: default_pubkey(),
            paused,
            greenlist_enforced,
            requests_count: 0,
            m_mint: default_pubkey(),
            m_mint_feed: default_pubkey(),
            ac_role: default_pubkey(),
            tokens_receiver: default_pubkey(),
            fee_receiver: default_pubkey(),
            instant_fee,
            instant_daily_limit: 0,
            variation_tolerance,
            min_amount: 0,
            instant_last_day: 0,
            instant_daily_limit_used: 0,
        }
    }

    fn account_ac(green_listed: bool, black_listed: bool) -> AccountAccessControlState {
        AccountAccessControlState {
            green_listed,
            black_listed,
        }
    }

    fn pause_inx(paused: bool) -> PauseInxState {
        PauseInxState { paused }
    }

    fn minter_vault_state(max_supply_cap: u64) -> MinterVaultState {
        MinterVaultState {
            first_deposit_min_m_tokens: 0,
            common_vault: default_pubkey(),
            mint_authority_pda: default_pubkey(),
            max_supply_cap,
        }
    }

    #[test]
    fn test_validate_green_listed_skips_when_both_false() {
        let common = vault_common(false, false, 0, 0);
        let ac = account_ac(false, false);
        assert!(validate_green_listed(&common, &ac, false).is_ok());
    }

    #[test]
    fn test_validate_green_listed_requires_when_enforced() {
        let common = vault_common(false, true, 0, 0);
        let ac = account_ac(false, false);
        assert!(validate_green_listed(&common, &ac, false).is_err());
        let ac = account_ac(true, false);
        assert!(validate_green_listed(&common, &ac, false).is_ok());
    }

    #[test]
    fn test_validate_green_listed_requires_when_require_green_list_true() {
        let common = vault_common(false, false, 0, 0);
        let ac = account_ac(false, false);
        assert!(validate_green_listed(&common, &ac, true).is_err());
        let ac = account_ac(true, false);
        assert!(validate_green_listed(&common, &ac, true).is_ok());
    }

    #[test]
    fn test_validate_black_listed_ok_when_not_blacklisted() {
        let ac = account_ac(true, false);
        assert!(validate_black_listed(&ac).is_ok());
    }

    #[test]
    fn test_validate_black_listed_err_when_blacklisted() {
        let ac = account_ac(true, true);
        assert!(validate_black_listed(&ac).is_err());
    }

    #[test]
    fn test_validate_paused_ok_when_not_paused() {
        let common = vault_common(false, false, 0, 0);
        let pause_inx = pause_inx(false);
        assert!(validate_paused(&common, &pause_inx).is_ok());
    }

    #[test]
    fn test_validate_paused_err_when_vault_paused() {
        let common = vault_common(true, false, 0, 0);
        let pause_inx = pause_inx(false);
        assert!(validate_paused(&common, &pause_inx).is_err());
    }

    #[test]
    fn test_validate_paused_err_when_inx_paused() {
        let common = vault_common(false, false, 0, 0);
        let pause_inx = pause_inx(true);
        assert!(validate_paused(&common, &pause_inx).is_err());
    }

    #[test]
    fn test_validate_common_ok_when_all_pass() {
        let common = vault_common(false, false, 0, 0);
        let ac = account_ac(true, false);
        let pause_inx = pause_inx(false);
        assert!(validate_common(&common, &ac, Some(&pause_inx), false).is_ok());
    }

    #[test]
    fn test_validate_common_fails_green_list() {
        let common = vault_common(false, true, 0, 0);
        let ac = account_ac(false, false);
        let pause_inx = pause_inx(false);
        assert!(validate_common(&common, &ac, Some(&pause_inx), false).is_err());
    }

    #[test]
    fn test_validate_common_fails_black_list() {
        let common = vault_common(false, false, 0, 0);
        let ac = account_ac(true, true);
        let pause_inx = pause_inx(false);
        assert!(validate_common(&common, &ac, Some(&pause_inx), false).is_err());
    }

    #[test]
    fn test_validate_common_fails_paused() {
        let common = vault_common(true, false, 0, 0);
        let ac = account_ac(true, false);
        let pause_inx = pause_inx(false);
        assert!(validate_common(&common, &ac, Some(&pause_inx), false).is_err());
    }

    #[test]
    fn test_validate_max_supply_cap_within_cap() {
        let minter = minter_vault_state(200);
        assert!(validate_max_supply_cap_with_supply(100, &minter, 50).unwrap());
    }

    #[test]
    fn test_validate_max_supply_cap_exceeds_cap() {
        let minter = minter_vault_state(150);
        assert!(!validate_max_supply_cap_with_supply(100, &minter, 60).unwrap());
    }

    #[test]
    fn test_validate_max_supply_cap_at_cap() {
        let minter = minter_vault_state(100);
        assert!(validate_max_supply_cap_with_supply(100, &minter, 0).unwrap());
    }

    #[test]
    fn test_validate_fee_valid() {
        assert!(validate_fee(0, false).is_ok());
        assert!(validate_fee(ONE_HUNDRED_PERCENT, false).is_ok());
        assert!(validate_fee(5000, false).is_ok());
    }

    #[test]
    fn test_validate_fee_with_min_check() {
        assert!(validate_fee(0, true).is_err());
        assert!(validate_fee(1, true).is_ok());
        assert!(validate_fee(ONE_HUNDRED_PERCENT, true).is_ok());
    }

    #[test]
    fn test_validate_fee_exceeds_100_percent() {
        assert!(validate_fee(ONE_HUNDRED_PERCENT + 1, false).is_err());
    }

    #[test]
    fn test_truncate_example_from_doc() {
        let value = 123_456_789u128;
        let decimals = 6;
        let truncated = truncate(value, decimals).unwrap();
        assert_eq!(truncated, 123_456_000);
    }

    #[test]
    fn test_truncate_base_9_no_change() {
        let value = 1_000_000_000u128; // 1.0 in base 9
        let truncated = truncate(value, 9).unwrap();
        assert_eq!(truncated, value);
    }

    #[test]
    fn test_truncate_reduces_precision() {
        let value = 1_234_567_890u128; // 1.234567890 in base 9
        let truncated = truncate(value, 6).unwrap();
        assert_eq!(truncated, 1_234_567_000);
    }
}
