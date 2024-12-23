pub mod ac_roles {
    /// Holder of this role can call `mint` instruction
    pub const M_MINTER: &[u8; 13] = b"m_minter_role";
    /// Holder of this role can call `burn` instruction
    pub const M_BURNER: &[u8; 13] = b"m_burner_role";
    /// Holder of this role can call `freeze` and `thaw` instructions
    pub const M_FREEZER: &[u8; 14] = b"m_freezer_role";
}
