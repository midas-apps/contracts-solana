use crate::{
    constants::{
        CHAINLINK_FEED_MAX_STALENESS, DEFAULT_PUBKEY, MANUAL_FEED_MAX_STALENESS,
        PYTH_FEED_MAX_STALENESS, SECONDS_IN_YEAR, SWITCHBOARD_FEED_MAX_STALENESS,
    },
    errors::DataFeedError,
    state::{FeedMode, ManualFeedGrowthState},
};
use anchor_lang::{prelude::*, require_keys_eq, AccountDeserialize, Key, Result};
use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;

use switchboard_on_demand::{PullFeedAccountData, PRECISION};

use crate::state::{FeedState, ManualFeedState};
use chainlink_solana::v2::read_feed_v2;

/// Parses the price from `feed` account and converts it
/// to the price with 9 decimal points.
/// Checks that price is not stale and its within max/min boundaries
///
/// # Arguments
///
/// - `data_feed` - `FeedState` account
/// - `feed` - account of the price feed. Currently supported types are:
///     - `ManualFeedState` (Manual feed account)
///     - `PullFeedAccountData` (Switchboard feed account)
///     - `PriceUpdateV2` (Pyth feed account)
///     - `Feed` (Chainlink OCR2 feed account)
pub fn get_price_in_base_9<'info>(
    data_feed: &FeedState,
    feed: &AccountInfo<'info>,
) -> Result<u128> {
    require_keys_eq!(
        data_feed.underlying_feed,
        feed.key(),
        DataFeedError::InvalidUnderlyingFeedProvided
    );

    let (raw_price, decimals) = match data_feed.mode {
        FeedMode::Manual => {
            // parse manual feed
            let mut buf: &[u8] = &feed.try_borrow_mut_data()?[..];
            let feed_parsed = ManualFeedState::try_deserialize(&mut buf)
                .map_err(|_| DataFeedError::InvalidUnderlyingFeedProvided)?;

            let current_ts = get_current_ts()?;

            let update_diff = current_ts
                .checked_sub(feed_parsed.last_updated_at)
                .ok_or(DataFeedError::ArithmeticOverflow)?;

            require_gte!(
                data_feed.max_staleness,
                update_diff,
                DataFeedError::PriceIsStale
            );

            (feed_parsed.price as u128, feed_parsed.decimals)
        }
        FeedMode::ManualGrowth => {
            // parse manual feed
            let mut buf: &[u8] = &feed.try_borrow_mut_data()?[..];
            let feed_parsed = ManualFeedGrowthState::try_deserialize(&mut buf)
                .map_err(|_| DataFeedError::InvalidUnderlyingFeedProvided)?;

            let current_ts = get_current_ts()?;

            let update_diff = current_ts
                .checked_sub(feed_parsed.last_updated_at)
                .ok_or(DataFeedError::ArithmeticOverflow)?;

            require_gte!(
                data_feed.max_staleness,
                update_diff,
                DataFeedError::PriceIsStale
            );

            (
                apply_growth_apr(
                    feed_parsed.price as u128,
                    feed_parsed.growth_apr,
                    feed_parsed.price_timestamp,
                    feed_parsed.decimals,
                )?,
                feed_parsed.decimals,
            )
        }
        FeedMode::Switchboard => {
            // parse switchboard feed
            let feed_data = feed.data.borrow();
            let feed = PullFeedAccountData::parse(feed_data)
                .map_err(|_| DataFeedError::InvalidUnderlyingFeedProvided)?;
            let raw_price = feed
                .get_value(
                    Clock::get().unwrap().slot,
                    data_feed.max_staleness.into(),
                    feed.min_sample_size.into(),
                    true,
                )
                .map_err(|_| DataFeedError::PriceIsStale)?;

            (
                raw_price
                    .mantissa()
                    .try_into()
                    .map_err(|_| DataFeedError::InvalidPrice)?,
                PRECISION.try_into().unwrap(),
            )
        }
        FeedMode::Pyth => {
            // parse pyth feed
            let mut buf: &[u8] = &feed.try_borrow_mut_data()?[..];
            let feed_parsed = PriceUpdateV2::try_deserialize(&mut buf)
                .map_err(|_| DataFeedError::InvalidUnderlyingFeedProvided)?;

            let raw_price = feed_parsed
                .get_price_no_older_than(
                    &Clock::get()?,
                    data_feed.max_staleness.into(),
                    &feed_parsed.price_message.feed_id,
                )
                .map_err(|_| DataFeedError::PriceIsStale)?;

            (
                raw_price
                    .price
                    .try_into()
                    .map_err(|_| DataFeedError::InvalidPrice)?,
                raw_price.exponent.abs().try_into().unwrap(),
            )
        }
        FeedMode::Chainlink => {
            // parse chainlink feed via direct account read (SDK v2)
            let data = feed.try_borrow_data()?;
            let result = read_feed_v2(data, feed.owner.to_bytes())
                .map_err(|_| DataFeedError::InvalidUnderlyingFeedProvided)?;

            let round = result
                .latest_round_data()
                .ok_or(DataFeedError::InvalidPrice)?;

            // enforce staleness using round.updated_at (seconds)
            let now = get_current_ts().unwrap() as u64;
            let age = now.checked_sub(round.timestamp as u64).unwrap_or(u64::MAX);

            require_gte!(
                data_feed.max_staleness as u64,
                age,
                DataFeedError::PriceIsStale
            );

            (
                round
                    .answer
                    .try_into()
                    .map_err(|_| DataFeedError::InvalidPrice)?,
                result.decimals(),
            )
        }
    };

    require_gt!(raw_price, 0, DataFeedError::InvalidPrice);

    let price = decimals_conversion::convert_to_base_9(raw_price, decimals)?;

    msg!("price: {}, {}", raw_price, price);

    require_gte!(
        price,
        data_feed.min_price as u128,
        DataFeedError::PriceIsLowerThanMin
    );

    require_gte!(
        data_feed.max_price as u128,
        price,
        DataFeedError::PriceIsHigherThanMax
    );

    Ok(price)
}

/// Returns current unix timestamp from clock
pub fn get_current_ts() -> Result<u32> {
    Ok(Clock::get().unwrap().unix_timestamp as u32)
}

/// Updates `FeedState` values.
/// If parameter value is None - it wont be updated
pub fn update_feed(
    state: &mut FeedState,
    ac_role: Option<Pubkey>,
    underlying_feed: Option<Pubkey>,
    mode: Option<FeedMode>,
    min_price: Option<u64>,
    max_price: Option<u64>,
    max_staleness: Option<u32>,
) -> Result<()> {
    if let Some(ac_role) = ac_role {
        state.ac_role = ac_role;
    }

    if let Some(underlying_feed) = underlying_feed {
        require!(
            !underlying_feed.eq(&DEFAULT_PUBKEY),
            DataFeedError::InvalidUnderlyingFeed
        );
        state.underlying_feed = underlying_feed;
    }

    if let Some(mode) = mode.clone() {
        state.mode = mode;
    }

    if let Some(max_price) = max_price {
        require_gt!(max_price, 0, DataFeedError::InvalidMaxPrice);
        require_gt!(max_price, state.min_price, DataFeedError::InvalidMaxPrice);
        state.max_price = max_price;
    }

    if let Some(min_price) = min_price {
        require_gt!(min_price, 0, DataFeedError::InvalidMinPrice);
        require_gt!(state.max_price, min_price, DataFeedError::InvalidMinPrice);
        state.min_price = min_price;
    }

    if let Some(max_staleness) = max_staleness {
        require_gt!(max_staleness, 0, DataFeedError::InvalidStaleness);
        state.max_staleness = max_staleness;
    }

    let max_staleness = match state.mode {
        FeedMode::Manual | FeedMode::ManualGrowth => MANUAL_FEED_MAX_STALENESS,
        FeedMode::Pyth => PYTH_FEED_MAX_STALENESS,
        FeedMode::Switchboard => SWITCHBOARD_FEED_MAX_STALENESS,
        FeedMode::Chainlink => CHAINLINK_FEED_MAX_STALENESS,
    };

    require_gte!(
        max_staleness,
        state.max_staleness,
        DataFeedError::ExceedsMaxStaleness
    );

    Ok(())
}

/// Updates `ManualFeedState` values.
/// If parameter value is None - it wont be updated
pub fn update_manual_feed(
    state: &mut ManualFeedState,
    price: Option<u64>,
    decimals: Option<u8>,
    max_answer_deviation: Option<u64>,
) -> Result<()> {
    if let Some(price) = price {
        state.price = price;
    }

    if let Some(decimals) = decimals {
        state.decimals = decimals;
    }

    if let Some(max_answer_deviation) = max_answer_deviation {
        state.max_answer_deviation = max_answer_deviation;
    }

    if Option::is_some(&decimals) || Option::is_some(&price) {
        state.last_updated_at = get_current_ts().unwrap();
    }

    Ok(())
}

/// Updates `ManualFeedGrowthState` values.
/// If parameter value is None - it wont be updated
pub fn update_manual_feed_growth(
    state: &mut ManualFeedGrowthState,
    price: Option<u64>,
    price_timestamp: Option<u32>,
    decimals: Option<u8>,
    max_answer_deviation: Option<u64>,
    growth_apr: Option<i64>,
    min_growth_apr: Option<i64>,
    max_growth_apr: Option<i64>,
    only_up: Option<bool>,
) -> Result<()> {
    if let Some(decimals) = decimals {
        state.decimals = decimals;
    }

    if let Some(max_answer_deviation) = max_answer_deviation {
        state.max_answer_deviation = max_answer_deviation;
    }

    if let Some(max_growth_apr) = max_growth_apr {
        require_gte!(
            max_growth_apr,
            state.min_growth_apr,
            DataFeedError::InvalidMaxGrowthApr
        );
        state.max_growth_apr = max_growth_apr;
    }

    if let Some(min_growth_apr) = min_growth_apr {
        require_gte!(
            state.max_growth_apr,
            min_growth_apr,
            DataFeedError::InvalidMinGrowthApr
        );
        state.min_growth_apr = min_growth_apr;
    }

    if let Some(only_up) = only_up {
        state.only_up = only_up;
    }

    if let Some(price) = price {
        state.price = price;
    }

    if let Some(growth_apr) = growth_apr {
        require_gte!(
            growth_apr,
            state.min_growth_apr,
            DataFeedError::InvalidGrowthApr
        );
        require_gte!(
            state.max_growth_apr,
            growth_apr,
            DataFeedError::InvalidGrowthApr
        );
        state.growth_apr = growth_apr;
    }

    if let Some(price_timestamp) = price_timestamp {
        require_gt!(
            get_current_ts().unwrap() as i64,
            price_timestamp as i64,
            DataFeedError::InvalidPriceTimestamp
        );
        state.price_timestamp = price_timestamp;
    }

    if Option::is_some(&decimals) || Option::is_some(&price) {
        state.last_updated_at = get_current_ts().unwrap();
    }

    Ok(())
}

pub fn apply_growth_apr(
    price: u128,
    growth_apr: i64,
    timestamp_from: u32,
    decimals: u8,
) -> Result<u128> {
    let timestamp_to = get_current_ts().unwrap();
    apply_growth_apr_impl(price, growth_apr, timestamp_from, timestamp_to, decimals)
}

pub(crate) fn apply_growth_apr_impl(
    price: u128,
    growth_apr: i64,
    timestamp_from: u32,
    timestamp_to: u32,
    decimals: u8,
) -> Result<u128> {
    require_gte!(
        timestamp_to,
        timestamp_from,
        DataFeedError::InvalidTimestamp
    );

    let passed_seconds = timestamp_to
        .checked_sub(timestamp_from)
        .ok_or(DataFeedError::ArithmeticOverflow)?;

    let denominator = 10_u128
        .checked_pow(decimals.into())
        .ok_or(DataFeedError::ArithmeticOverflow)?
        .checked_mul(SECONDS_IN_YEAR as u128)
        .ok_or(DataFeedError::ArithmeticOverflow)?
        .checked_mul(100u128)
        .ok_or(DataFeedError::ArithmeticOverflow)?;

    let interest = price
        .checked_mul(passed_seconds as u128)
        .ok_or(DataFeedError::ArithmeticOverflow)?
        .checked_mul(growth_apr.unsigned_abs() as u128)
        .ok_or(DataFeedError::ArithmeticOverflow)?
        .checked_div(denominator)
        .ok_or(DataFeedError::ArithmeticOverflow)?;

    let price_with_interest = if growth_apr > 0 {
        price
            .checked_add(interest)
            .ok_or(DataFeedError::ArithmeticOverflow)?
    } else {
        price
            .checked_sub(interest)
            .ok_or(DataFeedError::ArithmeticOverflow)?
    };

    Ok(price_with_interest)
}

pub fn get_deviation(last_price: u128, new_price: u128, decimals: u8) -> Result<u128> {
    if new_price == 0 {
        return Ok(100u128
            .checked_mul(10_u128.checked_pow(decimals.into()).unwrap())
            .ok_or(DataFeedError::ArithmeticOverflow)?);
    }

    if last_price == 0 {
        return Err(DataFeedError::InvalidPrice.into());
    }

    let one = 10_i128
        .checked_pow(decimals.into())
        .ok_or(DataFeedError::ArithmeticOverflow)?;

    let last_price_i: i128 = i128::try_from(last_price).unwrap();
    let new_price_i: i128 = i128::try_from(new_price).unwrap();

    let price_dif: i128 = new_price_i
        .checked_sub(last_price_i)
        .ok_or(DataFeedError::ArithmeticOverflow)?;

    let deviation: i128 = (price_dif
        .checked_mul(one)
        .ok_or(DataFeedError::ArithmeticOverflow)?
        .checked_mul(100)
        .ok_or(DataFeedError::ArithmeticOverflow)?)
    .checked_div(last_price_i)
    .ok_or(DataFeedError::ArithmeticOverflow)?;

    Ok(deviation.abs().try_into()?)
}

/// library for converting values from one decimal point precision to another
pub mod decimals_conversion {
    use anchor_lang::Result;

    use crate::errors::DataFeedError;

    /// converts `value` with `value_decimals` precision to a `value` with `target_decimals` precision
    /// # Arguments
    ///
    /// - `value` - value to convert
    /// - `value_decimals` - current value decimals
    /// - `value_decimals` - new value decimals
    pub fn convert(value: u128, value_decimals: u8, target_decimals: u8) -> Result<u128> {
        if value == 0 {
            return Ok(0);
        }

        if value_decimals == target_decimals {
            return Ok(value);
        }

        let adjusted_amount = if value_decimals > target_decimals {
            value
                .checked_div(
                    10_u128
                        .checked_pow(
                            (value_decimals
                                .checked_sub(target_decimals)
                                .ok_or(DataFeedError::ArithmeticOverflow)?)
                            .into(),
                        )
                        .ok_or(DataFeedError::ArithmeticOverflow)?,
                )
                .ok_or(DataFeedError::ArithmeticOverflow)?
        } else {
            value
                .checked_mul(
                    10_u128
                        .checked_pow(
                            (target_decimals
                                .checked_sub(value_decimals)
                                .ok_or(DataFeedError::ArithmeticOverflow)?)
                            .into(),
                        )
                        .ok_or(DataFeedError::ArithmeticOverflow)?,
                )
                .ok_or(DataFeedError::ArithmeticOverflow)?
        };

        Ok(adjusted_amount)
    }

    /// converts `value` with `value_decimals` precision to a `value` with 9 decimals precision
    /// # Arguments
    ///
    /// - `value` - value to convert
    /// - `value_decimals` - current value decimals
    pub fn convert_to_base_9(value: u128, value_decimals: u8) -> Result<u128> {
        convert(value, value_decimals, 9)
    }

    /// converts `value` with 9 decimals precision to a `value` with `target_decimals` precision
    /// # Arguments
    ///
    /// - `value` - value to convert
    /// - `value_decimals` - current value decimals
    pub fn convert_from_base_9(value: u128, target_decimals: u8) -> Result<u128> {
        convert(value, 9, target_decimals)
    }

    #[cfg(test)]
    mod tests {
        use std::ops::Mul;

        fn parse_units(v: f64, decimals: u8) -> u128 {
            v.mul(10u64.pow(decimals.into()) as f64).trunc() as u128
        }

        mod convert_to_base_9 {
            use crate::utils::decimals_conversion::{self, tests::parse_units};

            fn convert_to_base_9_test(amount: f64, orig_decimals: u8, expected_amount: u128) {
                assert_eq!(
                    decimals_conversion::convert_to_base_9(
                        parse_units(amount, orig_decimals),
                        orig_decimals
                    )
                    .unwrap(),
                    expected_amount
                );
            }

            #[test]
            fn when_original_decimals_6() {
                convert_to_base_9_test(15f64, 6, 15000000000)
            }

            #[test]
            fn when_original_decimals_6_and_amount_has_6_decimals() {
                convert_to_base_9_test(1.123456f64, 6, 1123456000)
            }

            #[test]
            fn when_original_decimals_12() {
                convert_to_base_9_test(14.4f64, 12, 14400000000)
            }

            #[test]
            fn when_original_decimals_0() {
                convert_to_base_9_test(114f64, 0, 114000000000)
            }

            #[test]
            fn when_original_decimals_9() {
                convert_to_base_9_test(114f64, 9, 114000000000)
            }
        }

        mod convert_from_base_9 {
            use crate::utils::decimals_conversion::{self, tests::parse_units};

            fn convert_from_base_9_test(amount: f64, target_decimals: u8, expected_amount: u128) {
                assert_eq!(
                    decimals_conversion::convert_from_base_9(
                        parse_units(amount, 9),
                        target_decimals
                    )
                    .unwrap(),
                    expected_amount
                );
            }

            #[test]
            fn when_original_decimals_6() {
                convert_from_base_9_test(15f64, 6, 15000000)
            }

            #[test]
            fn when_original_decimals_6_and_amount_has_6_decimals() {
                convert_from_base_9_test(1.123456f64, 6, 1123456)
            }

            #[test]
            fn when_original_decimals_4_and_amount_truncated() {
                convert_from_base_9_test(1.123456f64, 4, 11234)
            }

            #[test]
            fn when_original_decimals_12() {
                convert_from_base_9_test(14.4f64, 12, 14400000000000)
            }

            #[test]
            fn when_original_decimals_0() {
                convert_from_base_9_test(114f64, 0, 114)
            }

            #[test]
            fn when_original_decimals_9() {
                convert_from_base_9_test(114f64, 9, 114000000000)
            }
        }
    }
}

#[cfg(test)]
mod growth_and_deviation_tests {
    use super::{apply_growth_apr_impl, get_deviation};
    use crate::constants::SECONDS_IN_YEAR;

    fn units(amount: f64, decimals: u8) -> u128 {
        (amount * 10f64.powi(decimals as i32)).trunc() as u128
    }

    /// growth_apr has decimals precision: e.g. 5% with 8 decimals = 5 * 10^8
    fn growth_apr_percent(percent: f64, decimals: u8) -> i64 {
        (percent * 10f64.powi(decimals as i32)).trunc() as i64
    }

    // ---------- get_deviation ----------

    #[test]
    fn get_deviation_zero_when_prices_equal() {
        let last = units(100.0, 6);
        assert_eq!(get_deviation(last, last, 6).unwrap(), 0);
    }

    #[test]
    fn get_deviation_one_percent_up() {
        let last = units(100.0, 6);
        let new = units(101.0, 6);
        assert_eq!(get_deviation(last, new, 6).unwrap(), 1_000_000);
    }

    #[test]
    fn get_deviation_ten_percent_down() {
        let last = units(100.0, 6);
        let new = units(90.0, 6);
        assert_eq!(get_deviation(last, new, 6).unwrap(), 10_000_000);
    }

    #[test]
    fn get_deviation_when_new_price_zero_returns_100_percent() {
        let last = units(100.0, 6);
        assert_eq!(get_deviation(last, 0, 6).unwrap(), 100_000_000);
    }

    #[test]
    fn get_deviation_different_decimals() {
        let last = units(1.0, 9);
        let new = units(1.05, 9);
        assert_eq!(get_deviation(last, new, 9).unwrap(), 5_000_000_000);
    }

    // ---------- apply_growth_apr_impl ----------

    #[test]
    fn apply_growth_apr_zero_time_returns_unchanged_price() {
        let price = units(100.0, 8);
        let from = 1000u32;
        let to = 1000u32;
        assert_eq!(
            apply_growth_apr_impl(price, growth_apr_percent(5.0, 8), from, to, 8).unwrap(),
            price
        );
    }

    #[test]
    fn apply_growth_apr_positive_apr_increases_price() {
        let price = units(100.0, 8);
        let from = 0u32;
        let to = SECONDS_IN_YEAR;
        let growth_apr = growth_apr_percent(5.0, 8);
        let result = apply_growth_apr_impl(price, growth_apr, from, to, 8).unwrap();
        assert_eq!(result, units(105.0, 8));
    }

    #[test]
    fn apply_growth_apr_negative_apr_decreases_price() {
        let price = units(100.0, 8);
        let from = 0u32;
        let to = SECONDS_IN_YEAR;
        let growth_apr = growth_apr_percent(-5.0, 8);
        let result = apply_growth_apr_impl(price, growth_apr, from, to, 8).unwrap();
        assert_eq!(result, units(95.0, 8));
    }

    #[test]
    fn apply_growth_apr_half_year_half_interest() {
        let price = units(100.0, 8);
        let from = 0u32;
        let to = SECONDS_IN_YEAR / 2;
        let growth_apr = growth_apr_percent(10.0, 8);
        let result = apply_growth_apr_impl(price, growth_apr, from, to, 8).unwrap();
        assert_eq!(result, units(105.0, 8));
    }

    #[test]
    fn apply_growth_apr_invalid_timestamp_to_before_from_errors() {
        let price = units(100.0, 8);
        let from = 1000u32;
        let to = 999u32;
        assert!(apply_growth_apr_impl(price, growth_apr_percent(5.0, 8), from, to, 8).is_err());
    }
}
