use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_2022::transfer_checked,
    token_interface::{
        withdraw_withheld_tokens_from_mint, Mint, Token2022, TokenAccount,
        WithdrawWithheldTokensFromMint, TransferChecked
}};

use crate::state::CreatorAndDao;

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub authority: Signer<'info>,
    /// CHECK: Read only authority
    pub dao: AccountInfo<'info>,
    /// CHECK: Read only authority
    pub creator: AccountInfo<'info>,
    #[account(
        mut,
        associated_token::mint = mint_account,
        associated_token::authority = creator,
        associated_token::token_program = token_program
    )]
    pub creator_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        associated_token::mint = mint_account,
        associated_token::authority = dao,
        associated_token::token_program = token_program
    )]
    pub dao_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    //PDA
    #[account(
        mut,
        has_one = creator_token_account,
        has_one = dao_token_account,
        seeds = [b"creator_and_dao", authority.key().as_ref(), mint_account.key().as_ref()],
        bump,
    )]
    pub creator_and_dao: Box<Account<'info, CreatorAndDao>>,
    // Auxiliar account to transfer the funds
     #[account(
        mut,
        associated_token::mint = mint_account,
        associated_token::authority = creator_and_dao,
        associated_token::token_program = token_program
    )]
    pub creator_and_dao_token_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(
        mut,
        mint::token_program = token_program //Check mint is Token2020
    )]
    pub mint_account: InterfaceAccount<'info, Mint>,
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// Solana ecosystem accounts
    pub system_program: Program<'info, System>,
}

// transfer fees "harvested" to the mint account can then be withdraw by the withdraw authority
// this transfers fees on the mint account to the specified token account
pub fn process_withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    // mint account decimals
    let decimals = ctx.accounts.mint_account.decimals;
    let splitted_amount = amount / 2;

    let seeds = &[
        b"creator_and_dao",
        ctx.accounts.authority.to_account_info().key.as_ref(),
        ctx.accounts.mint_account.to_account_info().key.as_ref(),
        &[ctx.bumps.creator_and_dao],
    ];
    let signer_seeds = [&seeds[..]];

    // Withdraw from mint previously harvested tokens
    withdraw_withheld_tokens_from_mint(
        CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        WithdrawWithheldTokensFromMint {
            token_program_id: ctx.accounts.token_program.to_account_info(),
            mint: ctx.accounts.mint_account.to_account_info(),
            destination: ctx.accounts.creator_and_dao_token_account.to_account_info(),
            authority: ctx.accounts.creator_and_dao.to_account_info(),
        },
        &signer_seeds)
    )?;

    // Transfer to Creator
    transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked{
                from: ctx.accounts.creator_and_dao_token_account.to_account_info(),
                mint: ctx.accounts.mint_account.to_account_info(),
                to: ctx.accounts.creator_token_account.to_account_info(),
                authority: ctx.accounts.creator_and_dao.to_account_info(),
            },
            &signer_seeds,
        ),
        splitted_amount,   // transfer amount
        decimals, // decimals
    )?;

    // Transfer to DAO
    transfer_checked(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            TransferChecked{
                from: ctx.accounts.creator_and_dao_token_account.to_account_info(),
                mint: ctx.accounts.mint_account.to_account_info(),
                to: ctx.accounts.dao_token_account.to_account_info(),
                authority: ctx.accounts.creator_and_dao.to_account_info(),
            },
            &signer_seeds,
        ),
        splitted_amount,   // transfer amount
        decimals, // decimals
    )?;
    
    Ok(())
}