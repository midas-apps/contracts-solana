use anchor_lang::prelude::*;

#[event]
pub struct CommonVaultCreatedEvent {
    pub vault_common: Pubkey,
}
