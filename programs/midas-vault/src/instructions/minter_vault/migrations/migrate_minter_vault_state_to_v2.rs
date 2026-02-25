use anchor_lang::{prelude::*, system_program};

use crate::state::{MinterVaultState, VaultCommonState};

/// Old size of MinterVaultState (before max_supply_cap was added)
/// 8 (discriminator) + MinterVaultState::INIT_SPACE - 8 (max_supply_cap)
const OLD_MINTER_VAULT_SIZE: usize = 80;

#[derive(Accounts)]
pub struct MigrateMinterVaultStateToV2<'info> {
    /// Payer for realloc (lamports for extra space)
    #[account(mut)]
    pub payer: Signer<'info>,

    /// Vault common state account
    #[account()]
    pub vault_common: Account<'info, VaultCommonState>,

    /// Minter vault state account - use UncheckedAccount to bypass deserialization
    /// CHECK: We verify PDA seeds manually and handle migration logic
    #[account(
        mut,
        seeds = [MinterVaultState::SEED, vault_common.key().as_ref()],
        bump
    )]
    pub minter_vault: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

/// Migrates minter vault state from MinterVaultState to MinterVaultStateV2
pub fn handle(ctx: Context<MigrateMinterVaultStateToV2>) -> Result<()> {
    let minter_vault = &ctx.accounts.minter_vault;
    let current_len = minter_vault.data_len();
    let new_len = 8 + MinterVaultState::INIT_SPACE;

    // Check if already migrated
    if current_len >= new_len {
        msg!("Minter vault already migrated (size: {})", current_len);
        return Ok(());
    }

    // Verify old size matches expected
    require_eq!(
        current_len,
        OLD_MINTER_VAULT_SIZE,
        anchor_lang::error::ErrorCode::AccountDidNotDeserialize
    );

    // Calculate additional lamports needed for the extra space
    let rent = Rent::get()?;
    let new_minimum_balance = rent.minimum_balance(new_len);
    let current_balance = minter_vault.lamports();
    let lamports_diff = new_minimum_balance.saturating_sub(current_balance);

    // Transfer lamports if needed
    if lamports_diff > 0 {
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.payer.to_account_info(),
                    to: minter_vault.to_account_info(),
                },
            ),
            lamports_diff,
        )?;
    }

    // Realloc the account
    minter_vault.resize(new_len)?;

    // Write max_supply_cap (u64::MAX) at the end of existing data
    let mut data = minter_vault.try_borrow_mut_data()?;
    let max_supply_cap_bytes = u64::MAX.to_le_bytes();
    data[OLD_MINTER_VAULT_SIZE..OLD_MINTER_VAULT_SIZE + 8].copy_from_slice(&max_supply_cap_bytes);

    msg!(
        "Migrated minter vault from {} to {} bytes, set max_supply_cap to u64::MAX",
        OLD_MINTER_VAULT_SIZE,
        new_len
    );

    Ok(())
}
