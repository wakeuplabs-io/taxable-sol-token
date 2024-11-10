use anchor_lang::prelude::*;
use anchor_spl::{
    //associated_token::AssociatedToken, 
    token_interface::{transfer_fee_set, Mint, Token2022, TransferFeeSetTransferFee},
};

declare_id!("5QJsy43QNeMtmLfwWn1KD6w5pVEwmPPvuULuMu5q2XWr");

#[program]
pub mod tax_manager {
    use super::*;

    // pub fn initialize(ctx: Context<Initialize>) -> Result<()> {

    //     msg!("Greetings from: {:?}", ctx.program_id);
    //     Ok(())
    // }

    // https://github.com/solana-developers/program-examples/blob/main/tokens/token-2022/transfer-fee/anchor/programs/transfer-fee/src/instructions/update_fee.rs
    // Note that there is a 2 epoch delay from when new fee updates take effect
    // This is a safely feature built into the extension
    pub fn set_transfer_fee(ctx: Context<TaxFee>, transfer_fee_basis_points: u16) -> Result<()> {
        let token_program = &ctx.accounts.token_program;
        let mint = &ctx.accounts.mint;
        let authority = &ctx.accounts.authority;
        let maximum_fee: u64 = u64::MAX; // 18_446_744_073_709_551_615u64

        // Max tax is 3% (300 basis points)
        require!(transfer_fee_basis_points <= 300, TaxManagerError::FeeTooHigh);
        // Min tax is 0.1% (10 basis points)
        require!(transfer_fee_basis_points >= 100, TaxManagerError::FeeTooLow);

        // Transfer tokens from taker to initializer
        // https://docs.rs/anchor-spl/latest/anchor_spl/token_2022_extensions/transfer_fee/struct.TransferFeeSetTransferFee.html
        let cpi_accounts = TransferFeeSetTransferFee {
            token_program_id: token_program.to_account_info().clone(),
            mint: mint.to_account_info().clone(),
            authority: authority.to_account_info().clone(),
        };
        let cpi_program = token_program.to_account_info();

        // Set transfer Fee
        // https://docs.rs/anchor-spl/latest/anchor_spl/token_2022_extensions/transfer_fee/fn.transfer_fee_set.html
        transfer_fee_set(
            CpiContext::new(cpi_program, cpi_accounts),
            transfer_fee_basis_points, 
            maximum_fee
        )?;
        
        // transfer_fee_set(
        //     CpiContext::new(
        //         ctx.accounts.token_program.to_account_info(),
        //         TransferFeeSetTransferFee {
        //             token_program_id: ctx.accounts.mint_account.to_account_info(),
        //             to: ctx.accounts.associated_token_account.to_account_info(),
        //             authority: ctx.accounts.mint_account.to_account_info(), // PDA mint authority, required as signer
        //         },
        //     )
        //     .with_signer(signer_seeds), // using PDA to sign
        //     amount * 10u64.pow(ctx.accounts.mint_account.decimals as u32), // Mint tokens, adjust for decimals
        // )?;
        // Ok(())


        Ok(())
    }
}

// #[derive(Accounts)]
// pub struct Initialize {}

#[derive(Accounts)]
pub struct TaxFee<'info> {
    // Mint of token
    // #[account(
    //     mint::token_program = token_program
    // )]
    #[account(mut)]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub token_program: Program<'info, Token2022>, //Setted to TOKEN_2022_PROGRAM_ID
}

#[error_code]
pub enum TaxManagerError {
    #[msg("Max fee basis points is 300")]
    FeeTooHigh,
    #[msg("Min fee basis points is 100")]
    FeeTooLow,

}