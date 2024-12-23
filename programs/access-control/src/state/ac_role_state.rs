use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
/// State layout for Access Control Role base account
/// As accounts that holds it are not a PDA
/// We declare a layout struct so anchor will generate a discriminator
/// Accounts that will hold roles will be PDAs that are using this
/// account as one of the keys
/// For different mProducts different AccessControlRole accounts will be used
/// To make products more decoupled from each other
pub struct AccessControlRoleState {}
