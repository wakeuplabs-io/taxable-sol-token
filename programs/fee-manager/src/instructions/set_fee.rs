use anchor_lang::prelude::*;
use anchor_spl::{
    //associated_token::AssociatedToken, 
    token_interface::{transfer_fee_set, Mint, Token2022, TransferFeeSetTransferFee},
};

#[derive(Accounts)]
pub struct TaxFee<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    // Config Fee Authority address is a PDA
    #[account(
        mut,
        seeds = [b"pda_authority", authority.key().as_ref()],
        bump
    )]
    pub pda_authority: SystemAccount<'info>,
    // Mint of token
    #[account(
        mut,
        mint::token_program = token_program //Check mint is Token2020
    )]
    pub mint: InterfaceAccount<'info, Mint>,
    //#[account(mut)]
    //pub payer: Signer<'info>,
    pub token_program: Program<'info, Token2022>, //Setted to TOKEN_2022_PROGRAM_ID
}


// https://github.com/solana-developers/program-examples/blob/main/tokens/token-2022/transfer-fee/anchor/programs/transfer-fee/src/instructions/update_fee.rs
// Note that there is a 2 epoch delay from when new fee updates take effect
// This is a safely feature built into the extension
pub fn process_set_fee(ctx: Context<TaxFee>, transfer_fee_basis_points: u16) -> Result<()> {
    //Authority is the PDA
    let authority = ctx.accounts.authority.to_account_info();
    let maximum_fee: u64 = u64::MAX; // 18_446_744_073_709_551_615u64

    // Max tax is 3% (300 basis points)
    require!(transfer_fee_basis_points <= 300, SetFeeError::FeeTooHigh);
    // Min tax is 0.1% (10 basis points)
    require!(transfer_fee_basis_points >= 100, SetFeeError::FeeTooLow);

    // PDA signer seeds
    let seed = authority.key();
    let bump_seed = ctx.bumps.pda_authority;
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"pda_authority", 
        seed.as_ref(),
        &[bump_seed]]];

    // Set transfer Fee
    // https://docs.rs/anchor-spl/latest/anchor_spl/token_2022_extensions/transfer_fee/fn.transfer_fee_set.html
    transfer_fee_set(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(), 
            // https://docs.rs/anchor-spl/latest/anchor_spl/token_2022_extensions/transfer_fee/struct.TransferFeeSetTransferFee.html
            TransferFeeSetTransferFee {
                token_program_id: ctx.accounts.token_program.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                authority: ctx.accounts.pda_authority.to_account_info(),
            }
        ).with_signer(signer_seeds), // using PDA to sign,
        transfer_fee_basis_points, 
        maximum_fee
    )?;

    Ok(())
}

#[error_code]
pub enum SetFeeError {
    #[msg("Max fee basis points is 300")]
    FeeTooHigh,
    #[msg("Min fee basis points is 100")]
    FeeTooLow,

}