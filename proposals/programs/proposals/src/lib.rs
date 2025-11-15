use anchor_lang::prelude::*;

declare_id!("FG1zzz11111111111111111111111111111111111111");

#[program]
pub mod proposals {
    use super::*;

    pub fn create_proposal(ctx: Context<CreateProposal>, title: String, description: String) -> Result<()> {
        let p = &mut ctx.accounts.proposal;
        p.author = *ctx.accounts.author.key;
        p.title = title;
        p.description = description;
        p.state = ProposalState::Open;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct CreateProposal<'info> {
    #[account(init, payer = author, space = 8 + 32 + 64 + 512 + 16)]
    pub proposal: Account<'info, Proposal>,
    #[account(mut)]
    pub author: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct Proposal {
    pub author: Pubkey,
    pub title: String,
    pub description: String,
    pub state: ProposalState,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum ProposalState { Open, Closed }
