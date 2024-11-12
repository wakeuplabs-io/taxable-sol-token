use anchor_lang::prelude::*;

mod instructions;
use instructions::*;

mod state;


declare_id!("BnhW54yM9hZ1pFjfEkZePiniD6TZjGgRLjYqP6dFhCNQ");

#[program]
pub mod fee_manager {
    use super::*;

    // pub fn initialize(ctx: Context<Initialize>) -> Result<()> {

    //     msg!("Greetings from: {:?}", ctx.program_id);
    //     Ok(())
    // }

    pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
        process_withdraw(ctx)
    }

    // Note that there is a 2 epoch delay from when new fee updates take effect
    // This is a safely feature built into the extension
    pub fn set_fee(ctx: Context<TaxFee>, transfer_fee_basis_points: u16) -> Result<()> {
        process_set_fee(ctx, transfer_fee_basis_points)
    }

    pub fn set_authority(ctx: Context<ChangeAuthority>, authority_type: u8, new_authority: Option<Pubkey>) -> Result<()> {
        process_set_authority(ctx, authority_type, new_authority)
    }

    pub fn set_destination(ctx: Context<Destination>) -> Result<()> {
        process_set_destination(ctx)
    }
}

// #[derive(Accounts)]
// pub struct Initialize {}