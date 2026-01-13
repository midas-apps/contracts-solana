use anchor_lang::prelude::*;

pub mod constants;
pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;
use instructions::*;

declare_id!("MAC1H4FiknRdqG7DdEmQXgdp688w8Zo5t44T3CsKt3P");

#[program]
pub mod access_control {
    use super::*;

    pub fn new_ac_role(ctx: Context<NewAccessControlRole>) -> Result<()> {
        new_ac_role::handle(ctx)
    }

    pub fn new_ac(ctx: Context<NewAccessControl>) -> Result<()> {
        new_ac::handle(ctx)
    }

    pub fn new_account_ac(ctx: Context<NewAccountAccessControl>) -> Result<()> {
        new_account_ac::handle(ctx)
    }

    pub fn update_account_ac(
        ctx: Context<UpdateAccountAccessControl>,
        green_listed: Option<bool>,
        black_listed: Option<bool>,
    ) -> Result<()> {
        update_account_ac::handle(ctx, green_listed, black_listed)
    }

    pub fn grant_role(ctx: Context<GrantRole>, role: Vec<u8>) -> Result<()> {
        grant_role::handle(ctx, role)
    }

    pub fn revoke_role(ctx: Context<RevokeRole>, role: Vec<u8>) -> Result<()> {
        revoke_role::handle(ctx, role)
    }
}
