use crate::{errors::DataFeedError, state::FeedMode};
use anchor_lang::{prelude::*, require_keys_eq, AccountDeserialize, Key, Result};

use switchboard_on_demand::PullFeedAccountData;

use crate::state::{FeedState, ManualFeedState};

pub fn get_price_in_base_9<'info>(
    data_feed: &FeedState,
    feed: &AccountInfo<'info>,
) -> Result<u128> {
    require_keys_eq!(
        data_feed.underlying_feed,
        feed.key(),
        DataFeedError::InvalidFeedProvided // FIXME: error
    );

    let target_decimals = 9;

    let (raw_price, decimals, last_updated_at) = match data_feed.mode {
        FeedMode::MANUAL => {
            // parse manual feed
            let mut buf: &[u8] = &feed.try_borrow_mut_data()?[..];
            let feed_parsed = ManualFeedState::try_deserialize(&mut buf).unwrap();
            (
                feed_parsed.price,
                feed_parsed.decimals,
                feed_parsed.last_updated_at,
            )
        }
        FeedMode::SWITCHBOARD => {
            // parse switchboard feed
            let feed_data = feed.data.borrow();
            let feed = PullFeedAccountData::parse(feed_data).unwrap();
            let raw_price = feed.value();

            (
                0, /* FIXME */
                target_decimals,
                feed.last_update_timestamp.try_into()?,
            )
        }
    };

    let current_ts = get_current_ts()?;

    if last_updated_at > 0 {
        let update_diff = last_updated_at.checked_sub(current_ts).unwrap();

        require_gte!(
            data_feed.max_staleness,
            update_diff,
            DataFeedError::InvalidFeedProvided // FIXME: error
        );
    }

    let price = decimals_conversion::convert_to_base_9(raw_price.into(), decimals)?;

    msg!("price: {}, {}", raw_price, price);

    Ok(price)
}

pub fn get_current_ts() -> Result<u32> {
    Ok(Clock::get().unwrap().unix_timestamp as u32)
}

pub mod decimals_conversion {
    use anchor_lang::Result;

    pub fn convert(value: u128, value_decimals: u8, target_decimals: u8) -> Result<u128> {
        if value == 0 {
            return Ok(0);
        }

        if value_decimals == target_decimals {
            return Ok(value);
        }

        let adjusted_amount = if (value_decimals > target_decimals) {
            value / (10 as u128).pow((value_decimals - target_decimals).into())
        } else {
            value * (10 as u128).pow((target_decimals - value_decimals).into())
        };

        Ok(adjusted_amount)
    }
    pub fn convert_to_base_9(value: u128, value_decimals: u8) -> Result<u128> {
        convert(value, value_decimals, 9)
    }

    pub fn convert_from_base_9(value: u128, target_decimals: u8) -> Result<u128> {
        convert(value, 9, target_decimals)
    }
}
