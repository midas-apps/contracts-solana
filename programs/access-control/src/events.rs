use anchor_lang::prelude::*;

#[event]
pub struct AcRoleCreatedEvent {
    /// Created AccessControlRole account
    pub ac_role: Pubkey,
}

#[event]
pub struct AcCreatedEvent {
    /// Created AccessControl account
    pub ac: Pubkey,
    /// AccessControlRole account that was set in `ac`
    pub ac_role: Pubkey,
}

#[event]
pub struct AccountAcUpdatedEvent {
    /// AccessControl account
    pub ac: Pubkey,
    /// AccountAccessControl account
    pub account_ac: Pubkey,
    /// New green_listed value (if presented)
    pub green_listed: Option<bool>,
    /// New black_listed value (if presented)
    pub black_listed: Option<bool>,
}

#[event]
pub struct AccountAcRoleUpdatedEvent {
    /// AccessControlRole account
    pub ac_role: Pubkey,
    /// Role owner
    pub account: Pubkey,
    /// Role identifier
    pub role: Vec<u8>,
    /// If true - grant_role was called, revoke_role otherwise
    pub has: bool,
}
