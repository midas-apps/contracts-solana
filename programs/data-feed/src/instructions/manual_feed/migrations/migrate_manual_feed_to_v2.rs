use anchor_lang::{prelude::*, system_program};

use crate::state::{FeedState, ManualFeedState};

/// Old size of ManualFeedState (before max_answer_deviation was added)
/// 8 (discriminator) + ManualFeedState::INIT_SPACE - 8 (max_answer_deviation)
const OLD_MANUAL_FEED_SIZE: usize = 21;

#[derive(Accounts)]
pub struct MigrateManualFeedToV2<'info> {
    /// Payer for realloc (lamports for extra space)
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Base feed state account
    #[account()]
    pub base_feed: Account<'info, FeedState>,

    /// Manual feed state account - use UncheckedAccount to bypass deserialization
    /// CHECK: We verify PDA seeds manually and handle migration logic
    #[account(
        mut,
        seeds = [ManualFeedState::SEED, base_feed.key().as_ref()],
        bump
    )]
    pub manual_feed: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

/// Migrates manual feed state from ManualFeedState to ManualFeedState (V2)
pub fn handle(ctx: Context<MigrateManualFeedToV2>) -> Result<()> {
    let manual_feed = &ctx.accounts.manual_feed;
    let current_len = manual_feed.data_len();
    let new_len = 8 + ManualFeedState::INIT_SPACE;

    // Check if already migrated
    if current_len >= new_len {
        msg!("Manual feed already migrated (size: {})", current_len);
        return Ok(());
    }

    // Verify old size matches expected
    require_eq!(
        current_len,
        OLD_MANUAL_FEED_SIZE,
        anchor_lang::error::ErrorCode::AccountDidNotDeserialize
    );

    // Calculate additional lamports needed for the extra space
    let rent = Rent::get()?;
    let new_minimum_balance = rent.minimum_balance(new_len);
    let current_balance = manual_feed.lamports();
    let lamports_diff = new_minimum_balance.saturating_sub(current_balance);

    // Transfer lamports if needed
    if lamports_diff > 0 {
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.payer.to_account_info(),
                    to: manual_feed.to_account_info(),
                },
            ),
            lamports_diff,
        )?;
    }

    // Realloc the account
    manual_feed.resize(new_len)?;

    // Write max_answer_deviation (u64::MAX) at the end of existing data
    let mut data = manual_feed.try_borrow_mut_data()?;
    let max_answer_deviation_bytes = u64::MAX.to_le_bytes();
    data[OLD_MANUAL_FEED_SIZE..OLD_MANUAL_FEED_SIZE + 8]
        .copy_from_slice(&max_answer_deviation_bytes);

    msg!(
        "Migrated manual feed from {} to {} bytes, set max_answer_deviation to u64::MAX",
        OLD_MANUAL_FEED_SIZE,
        new_len
    );

    Ok(())
}
