use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct CreatorAndDao {
    /// CREATOR ATA
    pub creator_token_account: Pubkey,
    /// DAO ATA
    pub dao_token_account: Pubkey,
    /// MINT OF TOKEN
    pub mint_account: Pubkey,

}

impl CreatorAndDao {
    pub const LEN: usize = 8 + 32 + 32 + 32;
}