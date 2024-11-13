use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{
        Mint, Token2022, TokenAccount,
    },
};

use crate::state::CreatorAndDao;


#[derive(Accounts)]
pub struct InitDestination<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        mint::token_program = token_program //Check mint is Token2020
    )]
    pub mint_account: InterfaceAccount<'info, Mint>,
    /// CHECK: Read only authority
    pub dao: AccountInfo<'info>,
    /// CHECK: Read only authority
    pub creator: AccountInfo<'info>,
    #[account(
        associated_token::mint = mint_account,
        associated_token::authority = creator,
        associated_token::token_program = token_program
    )]
    pub creator_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        associated_token::mint = mint_account,
        associated_token::authority = dao,
        associated_token::token_program = token_program
    )]
    pub dao_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        init,
        payer = payer,
        space = CreatorAndDao::LEN,
        seeds = [b"creator_and_dao", authority.key().as_ref(), mint_account.key().as_ref()],
        bump,
    )]
    pub creator_and_dao: Box<Account<'info, CreatorAndDao>>,
    #[account(
        init,
        payer = payer,
        associated_token::mint = mint_account,
        associated_token::authority = creator_and_dao,
        associated_token::token_program = token_program
    )]
    pub creator_and_dao_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut)]
    pub payer: Signer<'info>,
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// Solana ecosystem accounts
    pub system_program: Program<'info, System>,
}


pub fn process_init_destination(ctx: Context<InitDestination>) -> Result<()> {
    let creator_and_dao = &mut ctx.accounts.creator_and_dao;
    creator_and_dao.creator_token_account = ctx.accounts.creator_token_account.key();
    creator_and_dao.dao_token_account = ctx.accounts.dao_token_account.key();
    Ok(())
}


#[derive(Accounts)]
pub struct SetDestination<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        mut,
        mint::token_program = token_program //Check mint is Token2020
    )]
    pub mint_account: InterfaceAccount<'info, Mint>,
    /// CHECK: Read only authority
    pub new_dao: AccountInfo<'info>,
    /// CHECK: Read only authority
    pub new_creator: AccountInfo<'info>,
    #[account(
        associated_token::mint = mint_account,
        associated_token::authority = new_creator,
        associated_token::token_program = token_program
    )]
    pub new_creator_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        associated_token::mint = mint_account,
        associated_token::authority = new_dao,
        associated_token::token_program = token_program
    )]
    pub new_dao_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        mut,
        seeds = [b"creator_and_dao", authority.key().as_ref(), mint_account.key().as_ref()],
        bump
    )]
    pub creator_and_dao: Box<Account<'info, CreatorAndDao>>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// Solana ecosystem accounts
    pub system_program: Program<'info, System>,
}

pub fn process_set_destination(ctx: Context<SetDestination>) -> Result<()> {
    let creator_and_dao = &mut ctx.accounts.creator_and_dao;
    creator_and_dao.creator_token_account = ctx.accounts.new_creator_token_account.key();
    creator_and_dao.dao_token_account = ctx.accounts.new_dao_token_account.key();
    Ok(())
}