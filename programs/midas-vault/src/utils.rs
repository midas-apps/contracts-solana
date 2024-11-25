use anchor_lang::{prelude::*, solana_program::clock::SECONDS_PER_DAY};

use anchor_spl::{
    token::{
        mint_to, spl_token::instruction::mint_to_checked, transfer_checked, MintTo, TransferChecked,
    },
    token_interface::{Mint, TokenAccount, TokenInterface},
};
use data_feed::{
    program::DataFeed,
    state::FeedState,
    utils::{decimals_conversion, get_price_in_base_9},
};

use crate::{
    constants::{seeds, MAX_UINT64, ONE_HUNDRED_PERCENT, STABLECOIN_RATE},
    errors::MidasVaultsError,
    midas_vaults,
    program::MidasVaults,
    state::{
        payment_mint_state, MinterVaultState, PaymentMintState, VaultCommonAccountState,
        VaultCommonState,
    },
};

pub fn require_and_update_min_amount(
    common: &VaultCommonState,
    common_account: &mut VaultCommonAccountState,
    minter: Option<&MinterVaultState>,
    amount: u64,
) -> Result<()> {
    if common_account.free_from_min_amount {
        return Ok(());
    }

    require_gte!(amount, common.min_amount, MidasVaultsError::Test);

    if let Some(minter) = minter {
        if !common_account.free_from_min_first_deposit {
            // FIXME: error
            require_gte!(
                amount,
                minter.first_deposit_min_m_tokens,
                MidasVaultsError::Test,
            );

            common_account.free_from_min_first_deposit = true;
        }
    }

    Ok(())
}

pub fn require_and_update_allowance(mint_config: &mut PaymentMintState, amount: u64) -> Result<()> {
    if mint_config.allowance == MAX_UINT64 {
        return Ok(());
    }

    // FIXME: error
    require_gte!(mint_config.allowance, amount, MidasVaultsError::Test);

    mint_config.allowance -= amount;

    Ok(())
}

pub fn require_and_update_limit(common: &mut VaultCommonState, amount: u64) -> Result<()> {
    let current_day = get_current_ts()?
        .checked_div(SECONDS_PER_DAY as u32)
        .unwrap();

    let new_limit = if common.instant_last_day == current_day {
        common.instant_daily_limit_used + amount
    } else {
        amount
    };

    // FIXME: error
    require_gte!(
        common.instant_daily_limit,
        new_limit,
        MidasVaultsError::Test
    );

    common.instant_daily_limit_used = new_limit;
    common.instant_last_day = current_day;

    Ok(())
}

pub fn require_variation_tolerance(
    common: &VaultCommonState,
    price: u64,
    new_price: u64,
) -> Result<()> {
    let price_diff = if new_price >= price {
        new_price - price
    } else {
        price - new_price
    };

    let price_diff_percent = price_diff
        .checked_mul(ONE_HUNDRED_PERCENT)
        .unwrap()
        .checked_div(price)
        .unwrap();

    // FIXME: error
    require_gte!(
        common.variation_tolerance,
        price_diff_percent,
        MidasVaultsError::Test
    );

    Ok(())
}

pub fn get_fee_amount(
    mint_config: &PaymentMintState,
    common: &VaultCommonState,
    account_common: &VaultCommonAccountState,
    amount: u64,
    is_instant: bool,
    additional_fee: u64,
) -> Result<u64> {
    if account_common.waived_fee {
        return Ok(0);
    }

    let mut fee_percent = if additional_fee == 0 {
        mint_config.fee
    } else {
        additional_fee
    };

    if is_instant {
        fee_percent += common.instant_fee;
    }

    if fee_percent > ONE_HUNDRED_PERCENT {
        fee_percent = ONE_HUNDRED_PERCENT;
    }

    Ok(amount
        .checked_mul(fee_percent)
        .unwrap()
        .checked_div(ONE_HUNDRED_PERCENT)
        .unwrap())
}

pub fn get_token_rate(data_feed: &FeedState, feed: &AccountInfo<'_>, stable: bool) -> Result<u64> {
    let price = get_price_in_base_9(data_feed, feed)?;

    if stable {
        return Ok(STABLECOIN_RATE);
    }

    Ok(price)
}

pub fn validate_fee(fee: u64, check_min: bool) -> Result<()> {
    require_gte!(ONE_HUNDRED_PERCENT, fee, MidasVaultsError::Test);

    if check_min {
        require_gt!(fee, 0, MidasVaultsError::Test);
    }

    Ok(())
}

pub fn transfer_token<'info>(
    vault: &Pubkey,
    token_program: &Interface<'info, TokenInterface>,
    mint: &Box<InterfaceAccount<'info, Mint>>,
    authority: &AccountInfo<'info>,
    from: &Box<InterfaceAccount<'info, TokenAccount>>,
    to: &Box<InterfaceAccount<'info, TokenAccount>>,
    amount: u64,
) -> Result<()> {
    let (_, vault_pda_bump_seed) =
        Pubkey::find_program_address(&[seeds::VAULT, vault.as_ref()], &MidasVaults::id());

    transfer_checked(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            TransferChecked {
                authority: authority.to_account_info(),
                mint: mint.to_account_info(),
                from: from.to_account_info(),
                to: to.to_account_info(),
            },
            &[&[seeds::VAULT, vault.as_ref(), &[vault_pda_bump_seed]]],
        ),
        amount,
        mint.decimals,
    )?;

    Ok(())
}

pub fn mint_token<'info>(
    vault: &Pubkey,
    token_program: &Interface<'info, TokenInterface>,
    mint: &Box<InterfaceAccount<'info, Mint>>,
    authority: &AccountInfo<'info>,
    to: &Box<InterfaceAccount<'info, TokenAccount>>,
    amount: u64,
) -> Result<()> {
    // TODO: replace with minter
    let (_, vault_pda_bump_seed) =
        Pubkey::find_program_address(&[seeds::VAULT, vault.as_ref()], &MidasVaults::id());

    mint_to(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            MintTo {
                authority: authority.to_account_info(),
                mint: mint.to_account_info(),
                to: to.to_account_info(),
            },
            &[&[seeds::VAULT, vault.as_ref(), &[vault_pda_bump_seed]]],
        ),
        amount,
    )?;

    Ok(())
}

pub mod minter {
    use anchor_spl::token_interface::Mint;

    use super::*;

    pub struct CalcAndValidateDepositReturn {
        pub mint_amount_in_usd: u64,
        pub fee_token_amount: u64,
        pub amount_token_wo_fee: u64,
        pub m_token_amount: u64,
        pub mint_in_rate: u64,
        pub m_token_rate: u64,
        pub decimals: u8,
    }

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

        payment_amount: u64,
        is_instant: bool,
    ) -> Result<CalcAndValidateDepositReturn> {
        require_gt!(payment_amount, 0, MidasVaultsError::Test);

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
                0,
            )?,
            decimals,
        )?;

        let amount_token_wo_fee = payment_amount.checked_sub(fee_token_amount).unwrap();

        let fee_in_usd = (fee_token_amount.checked_mul(mint_in_rate))
            .unwrap()
            .checked_div(10u64.pow(9))
            .unwrap();

        let (m_token_amount, m_token_rate) = convert_usd_to_m_token(
            m_data_feed,
            m_feed,
            mint_amount_in_usd.checked_sub(fee_in_usd).unwrap(),
        )?;

        require_and_update_min_amount(common, common_account, Some(minter), m_token_amount)?;

        require_gt!(m_token_amount, 0, MidasVaultsError::Test);

        Ok(CalcAndValidateDepositReturn {
            mint_amount_in_usd,
            fee_token_amount,
            amount_token_wo_fee,
            m_token_amount,
            mint_in_rate,
            m_token_rate,
            decimals,
        })
    }

    pub fn convert_payment_mint_to_usd(
        payment_mint_state: &PaymentMintState,
        data_feed: &FeedState,
        feed: &AccountInfo<'_>,
        amount: u64,
    ) -> Result<(u64, u64)> {
        require_gt!(amount, 0, MidasVaultsError::Test);

        let rate = get_token_rate(data_feed, feed, payment_mint_state.stable)?;
        require_gt!(rate, 0, MidasVaultsError::Test);

        Ok((
            amount
                .checked_mul(rate)
                .unwrap()
                .checked_div(10u64.pow(9))
                .unwrap(),
            rate,
        ))
    }

    pub fn convert_usd_to_m_token(
        data_feed: &FeedState,
        feed: &AccountInfo<'_>,
        amount: u64,
    ) -> Result<(u64, u64)> {
        require_gt!(amount, 0, MidasVaultsError::Test);

        let rate = get_token_rate(data_feed, feed, false)?;
        require_gt!(rate, 0, MidasVaultsError::Test);

        Ok((
            amount
                .checked_mul(10u64.pow(9))
                .unwrap()
                .checked_div(rate)
                .unwrap(),
            rate,
        ))
    }
}

pub fn get_current_ts() -> Result<u32> {
    Ok(Clock::get().unwrap().unix_timestamp as u32)
}

pub fn truncate(value: u64, decimals: u8) -> Result<u64> {
    return Ok(decimals_conversion::convert_to_base_9(
        decimals_conversion::convert_from_base_9(value, decimals)?,
        decimals,
    )?);
}
