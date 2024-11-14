use anchor_lang::prelude::*;
use anchor_spl::{
    //associated_token::AssociatedToken,
    token_2022::{
        spl_token_2022::instruction::AuthorityType::WithheldWithdraw,
        SetAuthority
    }, token_interface::{set_authority, Mint, Token2022}
};

use crate::state::CreatorAndDao;

#[derive(Accounts)]
pub struct ChangeWithdrawAuthority<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    // PDA for authority
    #[account(
        mut,
        seeds = [b"creator_and_dao", authority.key().as_ref(), mint.key().as_ref()],
        bump
    )]
    pub creator_and_dao: Box<Account<'info, CreatorAndDao>>,
    /// CHECK: Read only authority
    pub new_authority: AccountInfo<'info>,
    // PDA for new authority
    #[account(
        mut,
        seeds = [b"creator_and_dao", new_authority.key().as_ref(), mint.key().as_ref()],
        bump
    )]
    pub new_creator_and_dao: Box<Account<'info, CreatorAndDao>>,

    // Mint of token
    #[account(
        mut,
        mint::token_program = token_program //Check mint is Token2020
    )]
    pub mint: InterfaceAccount<'info, Mint>,
    pub token_program: Program<'info, Token2022>, //Setted to TOKEN_2022_PROGRAM_ID
}

pub fn process_set_withdraw_authority(ctx: Context<ChangeWithdrawAuthority>) -> Result<()> {
    //Authority is the PDA

    // PDA signer seeds
    let seeds = &[
        b"creator_and_dao",
        ctx.accounts.authority.to_account_info().key.as_ref(),
        ctx.accounts.mint.to_account_info().key.as_ref(),
        &[ctx.bumps.creator_and_dao],
    ];
    let signer_seeds = [&seeds[..]];

    // Set Authority
    // https://docs.rs/anchor-spl/latest/anchor_spl/token_2022/fn.set_authority.html
    set_authority(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(), 
            // https://docs.rs/anchor-spl/latest/anchor_spl/token_2022_extensions/transfer_fee/struct.TransferFeeSetTransferFee.html
            SetAuthority {
                account_or_mint: ctx.accounts.mint.to_account_info(),
                current_authority: ctx.accounts.creator_and_dao.to_account_info(),
            }
        ).with_signer(&signer_seeds), // using PDA to sign,
        WithheldWithdraw,
        Some(ctx.accounts.new_creator_and_dao.key()) // Convert to Option<Pubkey>
    )?;

    Ok(())
}

