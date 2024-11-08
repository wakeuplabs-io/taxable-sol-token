use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken, 
    token::{
        self,
        Mint, 
        Token, 
        TokenAccount,
        Transfer as SplTransfer
    }
};
use std::mem::size_of;

declare_id!("BT2b3ou3e3WyhmPXVb4Zok5hPN23uHPSkRfnHcV75MQW");

#[program]
pub mod splitter {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        // setting userdata in user's account
        // let accounts_to_split = &mut ctx.accounts.accounts_to_split;
        // accounts_to_split.creator = ctx.accounts.creator.key();
        // accounts_to_split.dao = ctx.accounts.dao.key();

        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }

    pub fn transfer_spl_tokens(ctx: Context<TransferSpl>, amount: u64) -> Result<()> {
        let destination = &ctx.accounts.to_ata;
        let source = &ctx.accounts.from_ata;
        let token_program = &ctx.accounts.token_program;
        let authority = &ctx.accounts.from;

        // Transfer tokens from taker to initializer
        let cpi_accounts = SplTransfer {
            from: source.to_account_info().clone(),
            to: destination.to_account_info().clone(),
            authority: authority.to_account_info().clone(),
        };
        let cpi_program = token_program.to_account_info();
        
        token::transfer(
            CpiContext::new(cpi_program, cpi_accounts),
            amount)?;

        Ok(())
    }
}

// https://www.rareskills.io/post/solana-initialize-account
#[derive(Accounts)]
pub struct Initialize {}
// pub struct Initialize<'info> {
    // #[account(mut)]
    // pub signer: Signer<'info>,
    // #[account(init,
    //     payer = signer,
    //     space=size_of::<AccountsToSplit>() + 8,
    //     seeds = [],
    //     bump)]
    // pub accounts_to_split: Account<'info, AccountsToSplit>,
    // #[account(
    //     init,
    //     payer = signer,
    //     associated_token::mint = mint_to_raise,
    //     associated_token::authority = fundraiser,
    // )]
    // pub vault: Account<'info, TokenAccount>,
    // pub mint_to_transfer: Account<'info, Mint>,

    // /// CHECK: Read only, delegatable creation
    // pub creator: AccountInfo<'info>,
    // /// CHECK: Read only, delegatable creation
    // pub dao: AccountInfo<'info>,


    // pub system_program: Program<'info, System>,
    // pub token_program: Program<'info, Token>,
    // pub associated_token_program: Program<'info, AssociatedToken>,
// }

// #[account]
// pub struct AccountsToSplit {
//     pub creator: Pubkey,
//     pub dao: Pubkey,
// }

#[derive(Accounts)]
pub struct TransferSpl<'info> {
    pub from: Signer<'info>,
    #[account(mut)]
    pub from_ata: Account<'info, TokenAccount>,
    #[account(mut)]
    pub to_ata: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

// #[error_code]
// pub enum Errors {
//     #[msg("transfer failed")]
//     TransferFailed,
// }