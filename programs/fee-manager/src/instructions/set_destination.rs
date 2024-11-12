use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{
        Mint, Token2022, TokenAccount,
    },
};

use crate::state::CreatorAndDao;


#[derive(Accounts)]
pub struct Destination<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(
        init,
        payer = payer,
        space = CreatorAndDao::LEN,
        seeds = [b"creator_and_dao", authority.key().as_ref()],
        bump,
    )]
    pub creator_and_dao: Box<Account<'info, CreatorAndDao>>,

    #[account(mut)]
    pub mint_account: InterfaceAccount<'info, Mint>,
    /// CHECK: Read only authority
    pub dao: AccountInfo<'info>,
    /// CHECK: Read only authority
    pub creator: AccountInfo<'info>,
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint_account,
        associated_token::authority = creator,
        associated_token::token_program = token_program
    )]
    pub creator_token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::mint = mint_account,
        associated_token::authority = dao,
        associated_token::token_program = token_program
    )]
    pub dao_token_account: InterfaceAccount<'info, TokenAccount>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    /// Solana ecosystem accounts
    pub system_program: Program<'info, System>,
}


// transfer fees are automatically deducted from the transfer amount
// recipients receives (transfer amount - fees)
// transfer fees are stored directly on the recipient token account and must be "harvested"
pub fn process_set_destination(ctx: Context<Destination>) -> Result<()> {
    let creator_and_dao = &mut ctx.accounts.creator_and_dao;
    creator_and_dao.creator_token_account = ctx.accounts.creator_token_account.key();
    creator_and_dao.dao_token_account = ctx.accounts.dao_token_account.key();
    creator_and_dao.mint_account = ctx.accounts.mint_account.key();

    Ok(())
}