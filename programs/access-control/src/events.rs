use anchor_lang::prelude::*;

#[event]
pub struct AcRoleCreatedEvent {
    pub ac_role: Pubkey,
}

#[event]
pub struct AcCreatedEvent {
    pub ac: Pubkey,
    pub ac_role: Pubkey,
}

#[event]
pub struct AccountAcUpdatedEvent {
    pub ac: Pubkey,
    pub account_ac: Pubkey,
    pub green_listed: Option<bool>,
    pub black_listed: Option<bool>,
}

#[event]
pub struct AccountAcRoleUpdatedEvent {
    pub ac_role: Pubkey,
    pub account: Pubkey,
    pub role: Vec<u8>,
    pub has: bool,
}
