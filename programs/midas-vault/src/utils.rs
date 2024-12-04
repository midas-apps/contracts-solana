use ::token_authority::cpi::accounts::Mint as AuthorityMint;
use access_control::state::AccountAccessControlState;
use anchor_lang::{prelude::*, solana_program::clock::SECONDS_PER_DAY};
use token_authority::token_authority;

use crate::{
    constants::{seeds, FIAT_MINT, MAX_UINT128, ONE, ONE_HUNDRED_PERCENT, STABLECOIN_RATE},
    errors::MidasVaultsError,
    program::MidasVaults,
    state::{
        MinterVaultState, PauseInxState, PaymentMintState, RedeemerVaultRequestState,
        RedeemerVaultState, VaultCommonAccountState, VaultCommonState,
    },
};
use anchor_spl::{
    token_2022::{burn, mint_to, transfer_checked, Burn, MintTo, TransferChecked},
    token_interface::{Mint, TokenAccount, TokenInterface},
};
use data_feed::{
    state::FeedState,
    utils::{decimals_conversion, get_price_in_base_9},
};

pub enum VaultActionId {
    MintInstant = 0,
    MintRequest,
    RedeemInstant,
    RedeemRequest,
    RedeemRequestFiat,
}

pub trait Closable {
    fn close(&mut self) -> Result<()>;
}

pub trait Validate<'info> {
    /// Validates the account struct.
    fn validate(&self) -> Result<()>;
}

pub fn close_account(
    acc_to_close: &mut AccountInfo<'_>,
    receiver: &mut AccountInfo<'_>,
    system_program: &Program<System>,
) -> Result<()> {
    let dest_starting_lamports = receiver.lamports();

    let account = acc_to_close.to_account_info();
    **receiver.lamports.borrow_mut() = dest_starting_lamports
        .checked_add(account.lamports())
        .unwrap();
    **account.lamports.borrow_mut() = 0;

    account.assign(&system_program.key());
    account.realloc(0, false)?;

    Ok(())
}

pub fn validate_green_listed(
    common: &VaultCommonState,
    account_ac: &AccountAccessControlState,
    require_green_list: bool,
) -> Result<()> {
    if !common.greenlist_enforced {
        return Ok(());
    }

    require!(account_ac.green_listed, MidasVaultsError::NotGreenListed);

    Ok(())
}

pub fn validate_black_listed(account_ac: &AccountAccessControlState) -> Result<()> {
    require!(!account_ac.black_listed, MidasVaultsError::Blacklisted);

    Ok(())
}

pub fn validate_paused(common: &VaultCommonState, pause_inx: &PauseInxState) -> Result<()> {
    require!(!common.paused, MidasVaultsError::VaultPaused);
    require!(!pause_inx.paused, MidasVaultsError::VaultInxPaused);

    Ok(())
}

pub fn validate_common(
    common: &VaultCommonState,
    account_ac: &AccountAccessControlState,
    pause_inx: &PauseInxState,
    require_green_list: bool,
) -> Result<()> {
    validate_green_listed(common, account_ac, require_green_list)?;
    validate_black_listed(account_ac)?;
    validate_paused(common, pause_inx)?;

    Ok(())
}

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

    mint_config.allowance -= amount;

    Ok(())
}

pub fn require_and_update_limit(common: &mut VaultCommonState, amount: u128) -> Result<()> {
    let current_day = get_current_ts()?
        .checked_div(SECONDS_PER_DAY as u32)
        .unwrap();

    let new_limit_used = if common.instant_last_day == current_day {
        common.instant_daily_limit_used + amount
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

pub fn require_variation_tolerance(
    common: &VaultCommonState,
    price: u128,
    new_price: u128,
) -> Result<()> {
    let price_diff = if new_price >= price {
        new_price - price
    } else {
        price - new_price
    };

    let price_diff_percent = price_diff
        .checked_mul(ONE_HUNDRED_PERCENT.into())
        .unwrap()
        .checked_div(price)
        .unwrap();

    require_gte!(
        common.variation_tolerance,
        price_diff_percent as u64,
        MidasVaultsError::VariationToleranceExceeded
    );

    Ok(())
}

pub fn get_fee_amount(
    mint_config: &PaymentMintState,
    common: &VaultCommonState,
    account_common: &VaultCommonAccountState,
    amount: u128,
    is_instant: bool,
    additional_fee: u128,
) -> Result<u128> {
    if account_common.waived_fee {
        return Ok(0);
    }

    let mut fee_percent = if additional_fee == 0 {
        mint_config.fee.into()
    } else {
        additional_fee
    };

    if is_instant {
        fee_percent += common.instant_fee as u128;
    }

    if fee_percent > ONE_HUNDRED_PERCENT.into() {
        fee_percent = ONE_HUNDRED_PERCENT.into();
    }

    Ok(amount
        .checked_mul(fee_percent)
        .unwrap()
        .checked_div(ONE_HUNDRED_PERCENT.into())
        .unwrap())
}

pub fn get_token_rate(data_feed: &FeedState, feed: &AccountInfo<'_>, stable: bool) -> Result<u128> {
    let price = get_price_in_base_9(data_feed, feed)?;

    if stable {
        return Ok(STABLECOIN_RATE.into());
    }

    Ok(price)
}

pub fn validate_fee(fee: u64, check_min: bool) -> Result<()> {
    require_gte!(ONE_HUNDRED_PERCENT, fee, MidasVaultsError::InvalidFee);

    if check_min {
        require_gt!(fee, 0, MidasVaultsError::InvalidFee);
    }

    Ok(())
}

pub fn transfer_token<'info>(
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

    msg!("TRANSFER AMOUNT {}", amount);

    msg!(
        "Accounts {} {} {} {}",
        from.key(),
        to.key(),
        authority.key(),
        mint.key()
    );

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

pub fn transfer_token_from_redeemer<'info>(
    vault_common: &Pubkey,
    token_program: &Interface<'info, TokenInterface>,
    mint: &Box<InterfaceAccount<'info, Mint>>,
    authority: &AccountInfo<'info>,
    from: &Box<InterfaceAccount<'info, TokenAccount>>,
    to: &Box<InterfaceAccount<'info, TokenAccount>>,
    amount_base9: u128,
) -> Result<()> {
    let (redeemer, vault_pda_bump_seed) = Pubkey::find_program_address(
        &[RedeemerVaultState::SEED, vault_common.as_ref()],
        &MidasVaults::id(),
    );

    let (_, redeemer_pda_bump_seed) = Pubkey::find_program_address(
        &[seeds::REQUEST_REDEEMER, redeemer.as_ref()],
        &MidasVaults::id(),
    );

    let amount: u64 =
        decimals_conversion::convert_from_base_9(amount_base9, mint.decimals)?.try_into()?;

    msg!("TRANSFER AMOUNT {}", amount);

    msg!(
        "Accounts {} {} {} {}",
        from.key(),
        to.key(),
        authority.key(),
        mint.key()
    );

    transfer_checked(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            TransferChecked {
                authority: authority.to_account_info(),
                mint: mint.to_account_info(),
                from: from.to_account_info(),
                to: to.to_account_info(),
            },
            &[
                // &[
                //     RedeemerVaultState::SEED,
                //     vault_common.as_ref(),
                //     &[vault_pda_bump_seed],
                // ],
                &[
                    seeds::REQUEST_REDEEMER,
                    redeemer.as_ref(),
                    &[redeemer_pda_bump_seed],
                ],
            ],
        ),
        amount,
        mint.decimals,
    )?;

    Ok(())
}

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
    // TODO: replace with minter
    let (minter_vault, vault_pda_bump_seed) = Pubkey::find_program_address(
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

    // let seeds: &[&[&[u8]]] = &[&[
    //     MinterVaultState::SEED,
    //     common_vault.as_ref(),
    //     &[vault_pda_bump_seed],
    // ]];

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

    // mint_to(
    //     CpiContext::new_with_signer(
    //         token_program.to_account_info(),
    //         MintTo {
    //             authority: authority.to_account_info(),
    //             mint: mint.to_account_info(),
    //             to: to.to_account_info(),
    //         },
    //         &[&[
    //             TokenAuthorityState::SEED,
    //             mint_authority_pda_seed,
    //             &[vault_pda_bump_seed],
    //         ]],
    //     ),
    //     amount,
    // )?;

    Ok(())
}

pub fn burn_mtoken<'info>(
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

    msg!("TRANSFER AMOUNT {}", amount);

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

pub mod minter {
    use anchor_spl::token_interface::Mint;

    use super::*;

    pub struct CalcAndValidateDepositReturn {
        pub mint_amount_in_usd: u128,
        pub fee_token_amount: u128,
        pub amount_token_wo_fee: u128,
        pub m_token_amount: u128,
        pub mint_in_rate: u128,
        pub m_token_rate: u128,
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
                0,
            )?,
            decimals,
        )?;

        let amount_token_wo_fee = payment_amount.checked_sub(fee_token_amount).unwrap();

        let fee_in_usd = (fee_token_amount.checked_mul(mint_in_rate))
            .unwrap()
            .checked_div(10u128.pow(9))
            .unwrap();

        msg!(
            "AMOUNTS {} {} {} {} {}",
            mint_amount_in_usd,
            fee_in_usd,
            fee_token_amount,
            mint_in_rate,
            payment_amount
        );
        let (m_token_amount, m_token_rate) = convert_usd_to_m_token(
            m_data_feed,
            m_feed,
            mint_amount_in_usd.checked_sub(fee_in_usd).unwrap(),
        )?;

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
        })
    }

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
                .unwrap()
                .checked_div(10u128.pow(9))
                .unwrap(),
            rate,
        ))
    }

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
                .checked_mul(10u128.pow(9))
                .unwrap()
                .checked_div(rate)
                .unwrap(),
            rate,
        ))
    }
}

pub mod common_vault {
    use super::*;

    pub fn update_payment_token(
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

        Ok(())
    }

    pub fn update_common_vault(
        state: &mut VaultCommonState,
        ac_role: Option<Pubkey>,
        tokens_receiver: Option<Pubkey>,
        fee_receiver: Option<Pubkey>,
        instant_fee: Option<u64>,
        instant_daily_limit: Option<u128>,
        variation_tolerance: Option<u64>,
        min_amount: Option<u64>,
    ) -> Result<()> {
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

    use super::*;

    pub struct CalcAndValidateRedeemReturn {
        pub fee_amount: u128,
        pub m_token_amount_wo_fee: u128,
    }

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
    ) -> Result<()> {
        let is_fiat = false;

        let params = redeemer::calc_and_validate_redeem(
            payment_mint_state,
            vault_common,
            vault_common_signer,
            redeemer_vault,
            amount_m_token.into(),
            false,
            false,
        )?;

        let payment_mint_rate = if !is_fiat {
            get_token_rate(
                &payment_mint_data_feed.unwrap(),
                &payment_mint_feed.unwrap(),
                payment_mint_state.stable,
            )?
        } else {
            ONE as u128
        };

        let m_token_rate = get_token_rate(&m_mint_data_feed, &m_mint_feed, false)?;

        transfer_token(
            &vault_common.key(),
            RedeemerVaultState::SEED,
            &m_mint_token_program,
            &m_mint,
            &signer.to_account_info(),
            &m_mint_signer_ata,
            &m_mint_vault_ata,
            params.m_token_amount_wo_fee,
        )?;

        if params.fee_amount > 0 {
            transfer_token(
                &vault_common.key(),
                RedeemerVaultState::SEED,
                &m_mint_token_program,
                &m_mint,
                &signer.to_account_info(),
                &m_mint_signer_ata,
                &m_mint_fee_receiver_ata,
                params.fee_amount,
            )?;
            msg!("TRANSFERRED1");
        }

        redeem_request.user = signer.key();
        redeem_request.payment_mint = payment_mint.key();
        redeem_request.m_token_amount = params.m_token_amount_wo_fee.try_into().unwrap();
        redeem_request.m_token_rate = m_token_rate.try_into().unwrap();
        redeem_request.payment_mint_rate = payment_mint_rate.try_into().unwrap();

        Ok(())
    }

    pub fn approve_redeem_request<'info>(
        request: &RedeemerVaultRequestState,
        vault_common: &Account<'info, VaultCommonState>,
        redeemer_vault: &Account<'info, RedeemerVaultState>,
        m_mint_token_program: &Interface<'info, TokenInterface>,
        m_mint: &Box<InterfaceAccount<'info, Mint>>,
        m_mint_vault_ata: &Box<InterfaceAccount<'info, TokenAccount>>,
        payment_mint_state: &mut PaymentMintState,

        request_redeemer: Option<&AccountInfo<'info>>,
        payment_mint: Option<&Box<InterfaceAccount<'info, Mint>>>,
        payment_mint_token_program: Option<&Interface<'info, TokenInterface>>,
        payment_mint_redeemer_ata: Option<&Box<InterfaceAccount<'info, TokenAccount>>>,
        payment_mint_user_ata: Option<&Box<InterfaceAccount<'info, TokenAccount>>>,

        request_id: u64,
        new_m_token_rate: u128,
        is_safe: bool,
    ) -> Result<()> {
        // TODO: move to separate helper fn

        let (expected_mint_key, is_fiat) = if let Some(payment_mint) = payment_mint {
            (payment_mint.key().clone(), false)
        } else {
            (FIAT_MINT, true)
        };

        require_keys_eq!(
            expected_mint_key,
            request.payment_mint,
            MidasVaultsError::InvalidPaymentMint
        );

        if is_safe {
            require_variation_tolerance(
                &vault_common,
                request.m_token_rate.into(),
                new_m_token_rate.into(),
            )?;
        }

        burn_mtoken(
            &vault_common.key(),
            m_mint_token_program,
            m_mint,
            &redeemer_vault.to_account_info(),
            m_mint_vault_ata,
            request.m_token_amount.try_into().unwrap(),
        )?;

        let decimals = if let Some(payment_mint) = payment_mint {
            payment_mint.decimals
        } else {
            9
        };

        let amount_token_wo_fee = truncate(
            (request.m_token_amount as u128)
                .checked_mul(new_m_token_rate.into())
                .unwrap()
                .checked_div(request.payment_mint_rate.into())
                .unwrap(),
            decimals,
        )?;

        require_and_update_allowance(payment_mint_state, amount_token_wo_fee)?;

        if !is_fiat {
            transfer_token_from_redeemer(
                &vault_common.key(),
                payment_mint_token_program.unwrap(),
                payment_mint.unwrap(),
                request_redeemer.unwrap(),
                payment_mint_redeemer_ata.unwrap(),
                payment_mint_user_ata.unwrap(),
                amount_token_wo_fee,
            )?;
        }

        // TODO: add event
        Ok(())
    }
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

        if common_account.free_from_min_amount {
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
            if is_fiat {
                redeemer.fiat_additional_fee.into()
            } else {
                0
            },
        )?;

        if is_fiat {
            if common_account.waived_fee {
                fee_amount += redeemer.fiat_flat_fee as u128;
            }
        }

        require_gt!(
            m_token_amount,
            fee_amount,
            MidasVaultsError::InvalidOutAmount
        );

        Ok(CalcAndValidateRedeemReturn {
            fee_amount,
            m_token_amount_wo_fee: m_token_amount.checked_sub(fee_amount).unwrap(),
        })
    }

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
                .unwrap()
                .checked_div(rate)
                .unwrap(),
            rate,
        ))
    }

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
                .unwrap()
                .checked_div(ONE.into())
                .unwrap(),
            rate,
        ))
    }
}

pub fn get_current_ts() -> Result<u32> {
    Ok(Clock::get().unwrap().unix_timestamp as u32)
}

pub fn truncate(value: u128, decimals: u8) -> Result<u128> {
    return Ok(decimals_conversion::convert_to_base_9(
        decimals_conversion::convert_from_base_9(value, decimals)?,
        decimals,
    )?);
}
