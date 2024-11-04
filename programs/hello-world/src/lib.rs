use anchor_lang::prelude::*;

declare_id!("DJi3QRBw25uLHk9XGSi18XyEQoxH37LkTVUjAeG9R8Ad");

#[program]
pub mod hello_world {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
