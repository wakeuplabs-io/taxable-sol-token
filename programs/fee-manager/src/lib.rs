use anchor_lang::prelude::*;
use anchor_spl::token_2022::spl_token_2022::instruction::AuthorityType:: {
            TransferFeeConfig, WithheldWithdraw
        };

mod instructions;
use instructions::*;

mod state;


declare_id!("BnhW54yM9hZ1pFjfEkZePiniD6TZjGgRLjYqP6dFhCNQ");

#[program]
pub mod fee_manager {
    use super::*;

    pub fn initialize(ctx: Context<InitDestination>) -> Result<()> {
        process_init_destination(ctx)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        process_withdraw(ctx, amount)
    }

    // Note that there is a 2 epoch delay from when new fee updates take effect
    // This is a safely feature built into the extension
    pub fn set_fee(ctx: Context<TaxFee>, transfer_fee_basis_points: u16) -> Result<()> {
        process_set_fee(ctx, transfer_fee_basis_points)
    }

    pub fn set_feeconfig_authority(ctx: Context<ChangeAuthority>) -> Result<()> {
        process_set_authority(ctx, TransferFeeConfig)
    }

    pub fn set_withdraw_authority(ctx: Context<ChangeAuthority>) -> Result<()> {
        process_set_authority(ctx, WithheldWithdraw)
    }

    pub fn set_destination(ctx: Context<SetDestination>) -> Result<()> {
        process_set_destination(ctx)
    }
}

// #[derive(Accounts)]
// pub struct Initialize {}