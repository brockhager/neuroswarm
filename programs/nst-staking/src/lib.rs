// Program: NeuroSwarm Network Staking and Reputation (NST) Program
// This program manages the validator registry, NST staking, and on-chain reputation scores.

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

// Define the program ID here (replace with final ID)
declare_id!("neuroSwarmNSTStakingProgramIDPlaceholder");

const MINIMUM_STAKE_NST: u64 = 5_000_000_000_000; // Example: 5,000 NST (assuming 9 decimals)
const REPUTATION_MULTIPLIER: u64 = 10000; // Scale 0.0 to 1.0 score to 0 to 10000 integer

#[program]
pub mod nst_staking_program {
    use super::*;

    /// Initializes the global registry and staking pool accounts.
    pub fn initialize_registry(ctx: Context<InitializeRegistry>) -> Result<()> {
        let registry = &mut ctx.accounts.validator_registry;
        registry.validator_count = 0;
        msg!("Validator Registry initialized.");
        Ok(())
    }

    /// Allows a user to register as a validator by staking the minimum NST requirement.
    pub fn register_validator(ctx: Context<RegisterValidator>) -> Result<()> {
        let registry = &mut ctx.accounts.validator_registry;
        let validator_state = &mut ctx.accounts.validator_state;
        
        // 1. Check Minimum Stake Requirement
        if ctx.accounts.user_nst_ata.amount < MINIMUM_STAKE_NST {
            return Err(ErrorCode::InsufficientStake.into());
        }

        // 2. Transfer NST to the Staking Pool (Escrow)
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_nst_ata.to_account_info(),
                    to: ctx.accounts.staking_pool_ata.to_account_info(),
                    authority: ctx.accounts.validator_authority.to_account_info(),
                },
            ),
            MINIMUM_STAKE_NST,
        )?;
        
        // 3. Initialize Validator State Account
        validator_state.authority = ctx.accounts.validator_authority.key();
        validator_state.stake_amount = MINIMUM_STAKE_NST;
        validator_state.reputation_score = REPUTATION_MULTIPLIER; // Start at 1.0 (10000)
        validator_state.is_active = true;
        registry.validator_count = registry.validator_count.checked_add(1).unwrap();

        msg!("Validator {} registered with {} NST staked.", ctx.accounts.validator_authority.key(), MINIMUM_STAKE_NST);
        Ok(())
    }

    /// Updates the validator's on-chain reputation score (called by the Router/Orchestrator).
    /// This score is used in the Priority Score calculation (30% weight).
    pub fn update_reputation(ctx: Context<UpdateReputation>, new_score_scaled: u64) -> Result<()> {
        let validator_state = &mut ctx.accounts.validator_state;

        // Ensure score is within valid bounds (0 to 10000)
        if new_score_scaled > REPUTATION_MULTIPLIER {
            return Err(ErrorCode::InvalidReputationScore.into());
        }
        
        // Only the dedicated Router/Orchestrator authority can update the score
        if ctx.accounts.signer.key() != *ctx.accounts.registry_authority.key {
             return Err(ErrorCode::UnauthorizedAccess.into());
        }

        validator_state.reputation_score = new_score_scaled;
        
        msg!("Reputation updated for {}. New score: {}/10000", validator_state.authority, new_score_scaled);
        Ok(())
    }
    
    // NOTE: Unstake and Slashing logic would be added here in a later iteration.
}

// --- Context Definitions ---

#[derive(Accounts)]
pub struct InitializeRegistry<'info> {
    // The account to hold the global state (Program Derived Address required)
    #[account(init, payer = signer, space = 8 + ValidatorRegistry::INIT_SPACE, seeds = [b"registry"], bump)]
    pub validator_registry: Account<'info, ValidatorRegistry>,
    
    /// CHECK: The authority used to sign registration and updates (Router/Orchestrator)
    pub registry_authority: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub signer: Signer<'info>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
#[instruction()]
pub struct RegisterValidator<'info> {
    // The Validator's unique state account
    #[account(init, payer = validator_authority, space = 8 + ValidatorState::INIT_SPACE, seeds = [b"validator", validator_authority.key().as_ref()], bump)]
    pub validator_state: Account<'info, ValidatorState>,
    
    // Global Registry
    #[account(mut, seeds = [b"registry"], bump)]
    pub validator_registry: Account<'info, ValidatorRegistry>,
    
    // User's NST Token Account (funds debited from here)
    #[account(mut)]
    pub user_nst_ata: Account<'info, TokenAccount>,
    
    // The Staking Pool (Program's dedicated Token Account for holding staked NST)
    #[account(mut)]
    pub staking_pool_ata: Account<'info, TokenAccount>,
    
    // The validator's wallet, acting as the authority
    #[account(mut)]
    pub validator_authority: Signer<'info>,
    
    // Core Solana Programs
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct UpdateReputation<'info> {
    /// CHECK: The authority that signs the reputation update (Router/Orchestrator)
    pub signer: Signer<'info>, 
    
    /// CHECK: The expected Router/Orchestrator authority (must match registry's defined authority)
    pub registry_authority: UncheckedAccount<'info>,

    // The Validator's state account to update
    #[account(mut, seeds = [b"validator", validator_state.authority.key().as_ref()], bump)]
    pub validator_state: Account<'info, ValidatorState>,
}


// --- Account Structures ---

#[account]
#[derive(InitSpace)]
pub struct ValidatorRegistry {
    pub validator_count: u64, // Total number of registered validators
    // Add PDA for staking pool/treasury accounts here
}

#[account]
#[derive(InitSpace)]
pub struct ValidatorState {
    pub authority: Pubkey,
    pub stake_amount: u64,
    pub reputation_score: u64, // Scaled from 0 to 10000 (0.0 to 1.0)
    pub is_active: bool,
    // Add epoch tracking and last update time here
}

// --- Error Codes ---

#[error_code]
pub enum ErrorCode {
    #[msg("Minimum stake requirement (5,000 NST) not met.")]
    InsufficientStake,
    #[msg("Reputation score must be between 0 and 10000.")]
    InvalidReputationScore,
    #[msg("Only the designated Registry Authority can perform this action.")]
    UnauthorizedAccess,
}
