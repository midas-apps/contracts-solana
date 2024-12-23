pub mod ac_roles {
    /// Admin role of a Access Control Role. Holder of this role can
    /// do role grant/revoke
    pub const ADMIN: &[u8; 10] = b"admin_role";

    /// Holder of this role can manage green/blacklist
    /// (update AccountAccessControlState)
    pub const UPDATE_ACCOUNT_AC: &[u8; 22] = b"update_account_ac_role";
}
