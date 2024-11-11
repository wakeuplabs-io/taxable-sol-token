use anchor_lang::prelude::*;
use anchor_spl::{
    //associated_token::AssociatedToken,
    token_2022::{
        spl_token_2022::instruction::AuthorityType:: {
            TransferFeeConfig, WithheldWithdraw
        },
        SetAuthority
    }, 
    token_interface::{set_authority, Mint, Token2022}
};

#[derive(Accounts)]
pub struct ChangeAuthority<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    // PDA for authority
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
    #[account(mut)]
    pub payer: Signer<'info>,
    pub token_program: Program<'info, Token2022>, //Setted to TOKEN_2022_PROGRAM_ID
}

pub fn process_set_authority(ctx: Context<ChangeAuthority>, authority_type: u8, new_authority: Option<Pubkey>) -> Result<()> {
    //Authority is the PDA
    let authority = ctx.accounts.authority.to_account_info();
    let authority_type_enum = match authority_type {
        4 => TransferFeeConfig,
        5 => WithheldWithdraw,
        _ => return Err(SetAuthorityError::OnlyTransferOrWithheld.into())
    };

    // PDA signer seeds
    let seed = authority.key();
    let bump_seed = ctx.bumps.pda_authority;
    let signer_seeds: &[&[&[u8]]] = &[&[
        b"pda_authority", 
        seed.as_ref(),
        &[bump_seed]]];

    // Set Authority
    // https://docs.rs/anchor-spl/latest/anchor_spl/token_2022/fn.set_authority.html
    set_authority(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(), 
            // https://docs.rs/anchor-spl/latest/anchor_spl/token_2022_extensions/transfer_fee/struct.TransferFeeSetTransferFee.html
            SetAuthority {
                account_or_mint: ctx.accounts.mint.to_account_info(),
                current_authority: ctx.accounts.pda_authority.to_account_info(),
            }
        ).with_signer(signer_seeds), // using PDA to sign,
        authority_type_enum, 
        new_authority
    )?;

    Ok(())
}

#[error_code]
pub enum SetAuthorityError {
    #[msg("AuthorityType can only be TransferFeeConfig or WithheldWithdraw type")]
    OnlyTransferOrWithheld
}