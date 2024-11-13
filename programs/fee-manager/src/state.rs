use anchor_lang::prelude::*;

#[account]
pub struct CreatorAndDao {
    /// CREATOR ATA
    pub creator_token_account: Pubkey,
    /// DAO ATA
    pub dao_token_account: Pubkey
}

impl CreatorAndDao {
    pub const LEN: usize = 8 + 32 + 32;
}