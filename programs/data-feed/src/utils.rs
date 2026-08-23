use crate::{
    constants::{
        DEFAULT_PUBKEY, MANUAL_FEED_MAX_STALENESS, PYTH_FEED_MAX_STALENESS,
        SWITCHBOARD_FEED_MAX_STALENESS,
    },
    errors::DataFeedError,
    state::FeedMode,
};
use anchor_lang::{prelude::*, require_keys_eq, AccountDeserialize, Key, Result};
use pyth_solana_receiver_sdk::price_update::PriceUpdateV2;

use switchboard_on_demand::{PullFeedAccountData, PRECISION};

use crate::state::{FeedState, ManualFeedState};

/// Parses the price from `feed` account and converts it
/// to the price with 9 decimal points.
/// Checks that price is not stale and its within max/min boundaries
///
/// # Arguments
///
/// - `data_feed` - `FeedState` account
/// - `feed` - account of the price feed. Currently supported types are:
///     - `ManualFeedState`
///     - `PullFeedAccountData`
///     - `PriceUpdateV2`
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
        FeedMode::MANUAL => {
            // parse manual feed
            let mut buf: &[u8] = &feed.try_borrow_mut_data()?[..];
            let feed_parsed = ManualFeedState::try_deserialize(&mut buf).unwrap();

            let current_ts = get_current_ts()?;

            if feed_parsed.last_updated_at > 0 {
                let update_diff = current_ts.checked_sub(feed_parsed.last_updated_at).unwrap();

                require_gte!(
                    data_feed.max_staleness,
                    update_diff,
                    DataFeedError::PriceIsStale
                );
            }

            (feed_parsed.price as u128, feed_parsed.decimals)
        }
        FeedMode::SWITCHBOARD => {
            // parse switchboard feed
            let feed_data = feed.data.borrow();
            let feed = PullFeedAccountData::parse(feed_data).unwrap();
            let raw_price = feed
                .get_value(
                    &Clock::get()?,
                    data_feed.max_staleness.into(),
                    feed.min_sample_size.into(),
                    true,
                )
                .unwrap();

            (raw_price.mantissa() as u128, PRECISION.try_into().unwrap())
        }
        FeedMode::PYTH => {
            // parse pyth feed
            let mut buf: &[u8] = &feed.try_borrow_mut_data()?[..];
            let feed_parsed = PriceUpdateV2::try_deserialize(&mut buf).unwrap();

            let raw_price = feed_parsed
                .get_price_no_older_than(
                    &Clock::get()?,
                    data_feed.max_staleness.into(),
                    &feed_parsed.price_message.feed_id,
                )
                .unwrap();

            (
                raw_price.price as u128,
                raw_price.exponent.abs().try_into().unwrap(),
            )
        }
    };

    let price = decimals_conversion::convert_to_base_9(raw_price.into(), decimals)?;

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

    match state.mode {
        FeedMode::MANUAL => require_gte!(
            MANUAL_FEED_MAX_STALENESS,
            state.max_staleness,
            DataFeedError::ExceedsMaxStaleness
        ),
        FeedMode::PYTH => require_gte!(
            PYTH_FEED_MAX_STALENESS,
            state.max_staleness,
            DataFeedError::ExceedsMaxStaleness
        ),
        FeedMode::SWITCHBOARD => require_gte!(
            SWITCHBOARD_FEED_MAX_STALENESS,
            state.max_staleness,
            DataFeedError::ExceedsMaxStaleness
        ),
    }

    Ok(())
}

/// Updates `ManualFeedState` values.
/// If parameter value is None - it wont be updated
pub fn update_manual_feed(
    state: &mut ManualFeedState,
    price: Option<u64>,
    decimals: Option<u8>,
) -> Result<()> {
    if let Some(price) = price {
        state.price = price;
    }

    if let Some(decimals) = decimals {
        state.decimals = decimals;
    }

    if Option::is_some(&decimals) || Option::is_some(&price) {
        state.last_updated_at = get_current_ts().unwrap();
    }

    Ok(())
}

/// library for converting values from one decimal point precision to another
pub mod decimals_conversion {
    use anchor_lang::prelude::*;

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

        let exponent = if value_decimals > target_decimals {
            value_decimals - target_decimals
        } else {
            target_decimals - value_decimals
        };
        let scale = 10u128
            .checked_pow(exponent.into())
            .ok_or_else(|| error!(DataFeedError::DecimalConversionOverflow))?;

        let adjusted_amount = if value_decimals > target_decimals {
            value / scale
        } else {
            value
                .checked_mul(scale)
                .ok_or_else(|| error!(DataFeedError::DecimalConversionOverflow))?
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

            #[test]
            fn returns_error_on_overflow() {
                assert!(decimals_conversion::convert_to_base_9(u128::MAX, 0).is_err());
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
