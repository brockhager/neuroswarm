# NSD Utility Token Program Specification (Solana)
## Elastic Supply SPL Token with Burn/Fee Distribution

> **Purpose**: This document defines the Solana Program architecture for the NeuroSwarm Data (NSD) utility token—an elastic supply token that fuels LLM requests through a burn-and-mint mechanism with automatic fee distribution.

---

## Program Overview

**Program Type:** Solana Native Program (Rust)  
**Token Standard:** SPL Token (extended)  
**Key Features:**
- Elastic supply (mint/burn)
- Atomic burn-for-request mechanism
- 70/20/10 fee split with automatic distribution
- Oracle-based fiat peg ($0.001 USD target)
- Emergency pause mechanism

---

## 1. Account Structure

### 1.1 NSD Mint Account

**Account Type:** SPL Token Mint  
**Purpose:** Stores global NSD token metadata

```rust
pub struct NSDMint {
    /// SPL Token mint authority (program-derived address)
    pub mint_authority: Pubkey,
    
    /// Total supply (mutable - elastic)
    pub supply: u64,
    
    /// Decimals (6 for micro-NSD)
    pub decimals: u8,
    
    /// Is mint frozen (emergency pause)
    pub is_frozen: bool,
    
    /// Oracle price feed (Pyth/Switchboard)
    pub oracle_address: Pubkey,
    
    /// Target price in USD (micro-dollars)
    pub target_price_usd: u64, // Default: 1000 = $0.001
}
```

---

### 1.2 Treasury Account

**Purpose:** Stores 20% of fees for DAO-controlled funding

```rust
pub struct TreasuryAccount {
    /// Treasury authority (governance multisig)
    pub authority: Pubkey,
    
    /// Associated token account for NSD
    pub nsd_token_account: Pubkey,
    
    /// Total accumulated fees
    pub total_fees_collected: u64,
    
    /// Bump seed for PDA
    pub bump: u8,
}
```

**PDA Derivation:**
```rust
let (treasury_pda, bump) = Pubkey::find_program_address(
    &[b"treasury"],
    &program_id
);
```

---

### 1.3 Request Account

**Purpose:** Tracks individual LLM requests and their fee distribution

```rust
pub struct RequestAccount {
    /// Unique request ID (UUID encoded)
    pub request_id: [u8; 16],
    
    /// User's wallet address
    pub user: Pubkey,
    
    /// Validator node handling this request
    pub validator: Pubkey,
    
    /// Total NSD burned by user
    pub nsd_burned: u64,
    
    /// Validator fee (70%)
    pub validator_fee: u64,
    
    /// Treasury fee (20%)
    pub treasury_fee: u64,
    
    /// Permanent burn (10%)
    pub permanent_burn: u64,
    
    /// Request status
    pub status: RequestStatus,
    
    /// Timestamp
    pub created_at: i64,
    
    /// Bump seed
    pub bump: u8,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub enum RequestStatus {
    Pending,
    Processing,
    Completed,
    Failed,
    Refunded,
}
```

**PDA Derivation:**
```rust
let (request_pda, bump) = Pubkey::find_program_address(
    &[b"request", request_id.as_ref()],
    &program_id
);
```

---

### 1.4 Validator Account

**Purpose:** Stores validator registration and reputation data

```rust
pub struct ValidatorAccount {
    /// Validator's wallet address
    pub authority: Pubkey,
    
    /// NST stake amount
    pub nst_stake: u64,
    
    /// Reputation score (0-100)
    pub reputation: u8,
    
    /// Total requests handled
    pub total_requests: u64,
    
    /// Successful completions
    pub successful_requests: u64,
    
    /// Total NSD fees earned
    pub total_fees_earned: u64,
    
    /// Supported models (serialized Vec<String>)
    pub supported_models: Vec<String>,
    
    /// API endpoint
    pub endpoint: String,
    
    /// Is active
    pub is_active: bool,
    
    /// Registration timestamp
    pub registered_at: i64,
    
    /// Bump seed
    pub bump: u8,
}
```

---

## 2. Instructions (Program Methods)

### 2.1 Initialize Program

**Instruction:** `initialize`  
**Authority:** Program deployer (one-time only)

```rust
pub fn initialize(
    ctx: Context<Initialize>,
    oracle_address: Pubkey,
    target_price_usd: u64,
) -> Result<()> {
    let mint = &mut ctx.accounts.nsd_mint;
    mint.mint_authority = ctx.accounts.mint_authority.key();
    mint.supply = 0;
    mint.decimals = 6;
    mint.is_frozen = false;
    mint.oracle_address = oracle_address;
    mint.target_price_usd = target_price_usd;
    
    // Initialize treasury PDA
    let treasury = &mut ctx.accounts.treasury;
    treasury.authority = ctx.accounts.governance_authority.key();
    treasury.nsd_token_account = ctx.accounts.treasury_token_account.key();
    treasury.total_fees_collected = 0;
    treasury.bump = *ctx.bumps.get("treasury").unwrap();
    
    Ok(())
}
```

---

### 2.2 Burn NSD for Request

**Instruction:** `burn_for_request`  
**Authority:** User wallet

**Purpose:** Atomically burn NSD and create request account

```rust
pub fn burn_for_request(
    ctx: Context<BurnForRequest>,
    request_id: [u8; 16],
    amount: u64,
    validator: Pubkey,
) -> Result<()> {
    require!(amount >= MIN_BURN_AMOUNT, ErrorCode::InsufficientBurn);
    
    // 1. Burn NSD from user's token account
    let cpi_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        token::Burn {
            mint: ctx.accounts.nsd_mint.to_account_info(),
            from: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        },
    );
    token::burn(cpi_ctx, amount)?;
    
    // 2. Calculate fee split (70/20/10)
    let validator_fee = amount.checked_mul(70).unwrap().checked_div(100).unwrap();
    let treasury_fee = amount.checked_mul(20).unwrap().checked_div(100).unwrap();
    let permanent_burn = amount.checked_sub(validator_fee + treasury_fee).unwrap();
    
    // 3. Create request account
    let request = &mut ctx.accounts.request;
    request.request_id = request_id;
    request.user = ctx.accounts.user.key();
    request.validator = validator;
    request.nsd_burned = amount;
    request.validator_fee = validator_fee;
    request.treasury_fee = treasury_fee;
    request.permanent_burn = permanent_burn;
    request.status = RequestStatus::Pending;
    request.created_at = Clock::get()?.unix_timestamp;
    request.bump = *ctx.bumps.get("request").unwrap();
    
    emit!(RequestCreated {
        request_id,
        user: ctx.accounts.user.key(),
        validator,
        amount,
    });
    
    Ok(())
}
```

---

### 2.3 Complete Request & Distribute Fees

**Instruction:** `complete_request`  
**Authority:** Validator or Router authority

**Purpose:** Mark request complete and mint fees to validator/treasury

```rust
pub fn complete_request(
    ctx: Context<CompleteRequest>,
    request_id: [u8; 16],
) -> Result<()> {
    let request = &mut ctx.accounts.request;
    
    require!(request.status == RequestStatus::Pending, ErrorCode::InvalidStatus);
    require!(request.validator == ctx.accounts.validator.key(), ErrorCode::Unauthorized);
    
    // 1. Mint validator fee (70%)
    let seeds = &[b"mint_authority", &[ctx.bumps.mint_authority]];
    let signer = &[&seeds[..]];
    
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        token::MintTo {
            mint: ctx.accounts.nsd_mint.to_account_info(),
            to: ctx.accounts.validator_token_account.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        },
        signer,
    );
    token::mint_to(cpi_ctx, request.validator_fee)?;
    
    // 2. Mint treasury fee (20%)
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        token::MintTo {
            mint: ctx.accounts.nsd_mint.to_account_info(),
            to: ctx.accounts.treasury_token_account.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        },
        signer,
    );
    token::mint_to(cpi_ctx, request.treasury_fee)?;
    
    // 3. Update treasury accounting
    let treasury = &mut ctx.accounts.treasury;
    treasury.total_fees_collected = treasury.total_fees_collected
        .checked_add(request.treasury_fee)
        .unwrap();
    
    // 4. Update validator stats
    let validator = &mut ctx.accounts.validator_account;
    validator.total_requests = validator.total_requests.checked_add(1).unwrap();
    validator.successful_requests = validator.successful_requests.checked_add(1).unwrap();
    validator.total_fees_earned = validator.total_fees_earned
        .checked_add(request.validator_fee)
        .unwrap();
    
    // 5. Update request status
    request.status = RequestStatus::Completed;
    
    emit!(RequestCompleted {
        request_id,
        validator: ctx.accounts.validator.key(),
        validator_fee: request.validator_fee,
        treasury_fee: request.treasury_fee,
    });
    
    Ok(())
}
```

---

### 2.4 Refund Failed Request

**Instruction:** `refund_request`  
**Authority:** Router authority or timeout mechanism

**Purpose:** Mint refund (95%) back to user on failure

```rust
pub fn refund_request(
    ctx: Context<RefundRequest>,
    request_id: [u8; 16],
) -> Result<()> {
    let request = &mut ctx.accounts.request;
    
    require!(
        request.status == RequestStatus::Pending || request.status == RequestStatus::Processing,
        ErrorCode::InvalidStatus
    );
    
    // 1. Calculate refund (95%)
    let refund_amount = request.nsd_burned.checked_mul(95).unwrap().checked_div(100).unwrap();
    let penalty = request.nsd_burned.checked_sub(refund_amount).unwrap();
    
    // 2. Mint refund to user
    let seeds = &[b"mint_authority", &[ctx.bumps.mint_authority]];
    let signer = &[&seeds[..]];
    
    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        token::MintTo {
            mint: ctx.accounts.nsd_mint.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        },
        signer,
    );
    token::mint_to(cpi_ctx, refund_amount)?;
    
    // 3. Slash validator reputation
    let validator = &mut ctx.accounts.validator_account;
    validator.reputation = validator.reputation.saturating_sub(5); // -5 penalty
    
    // 4. Update request status
    request.status = RequestStatus::Refunded;
    
    emit!(RequestRefunded {
        request_id,
        user: ctx.accounts.user.key(),
        refund_amount,
        penalty,
    });
    
    Ok(())
}
```

---

### 2.5 Register Validator

**Instruction:** `register_validator`  
**Authority:** Validator wallet

```rust
pub fn register_validator(
    ctx: Context<RegisterValidator>,
    nst_stake: u64,
    supported_models: Vec<String>,
    endpoint: String,
) -> Result<()> {
    require!(nst_stake >= MIN_VALIDATOR_STAKE, ErrorCode::InsufficientStake);
    require!(!supported_models.is_empty(), ErrorCode::NoModelsSupported);
    
    // Transfer NST stake to escrow (simplified - actual implementation uses CPI to NST program)
    // ... stake transfer logic ...
    
    let validator = &mut ctx.accounts.validator_account;
    validator.authority = ctx.accounts.validator.key();
    validator.nst_stake = nst_stake;
    validator.reputation = 100; // Start at neutral
    validator.total_requests = 0;
    validator.successful_requests = 0;
    validator.total_fees_earned = 0;
    validator.supported_models = supported_models.clone();
    validator.endpoint = endpoint.clone();
    validator.is_active = true;
    validator.registered_at = Clock::get()?.unix_timestamp;
    validator.bump = *ctx.bumps.get("validator").unwrap();
    
    emit!(ValidatorRegistered {
        validator: ctx.accounts.validator.key(),
        stake: nst_stake,
        models: supported_models,
    });
    
    Ok(())
}
```

---

### 2.6 Update Oracle Price

**Instruction:** `update_oracle_price`  
**Authority:** Oracle keeper bot

**Purpose:** Update NSD price for fiat peg monitoring

```rust
pub fn update_oracle_price(
    ctx: Context<UpdateOracle>,
    price_usd: u64, // micro-dollars (e.g., 1000 = $0.001)
) -> Result<()> {
    let mint = &mut ctx.accounts.nsd_mint;
    
    // Verify oracle signature
    require!(
        ctx.accounts.oracle.key() == mint.oracle_address,
        ErrorCode::UnauthorizedOracle
    );
    
    // Store price on-chain for transparency
    emit!(PriceUpdated {
        price_usd,
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    // Note: Actual price adjustment logic would be in off-chain keeper
    // that adjusts fee parameters based on supply/demand
    
    Ok(())
}
```

---

### 2.7 Emergency Pause

**Instruction:** `emergency_pause`  
**Authority:** Program upgrade authority or multisig

```rust
pub fn emergency_pause(
    ctx: Context<EmergencyPause>,
) -> Result<()> {
    let mint = &mut ctx.accounts.nsd_mint;
    
    require!(
        ctx.accounts.authority.key() == EMERGENCY_AUTHORITY,
        ErrorCode::Unauthorized
    );
    
    mint.is_frozen = true;
    
    emit!(EmergencyPaused {
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}

pub fn emergency_unpause(
    ctx: Context<EmergencyPause>,
) -> Result<()> {
    let mint = &mut ctx.accounts.nsd_mint;
    mint.is_frozen = false;
    
    emit!(EmergencyUnpaused {
        timestamp: Clock::get()?.unix_timestamp,
    });
    
    Ok(())
}
```

---

## 3. Constants & Parameters

```rust
/// Minimum NSD burn per request (5 NSD)
pub const MIN_BURN_AMOUNT: u64 = 5_000_000; // 6 decimals

/// Minimum validator stake (5,000 NST)
pub const MIN_VALIDATOR_STAKE: u64 = 5_000_000_000; // Assuming NST has 6 decimals

/// Fee split percentages
pub const VALIDATOR_FEE_PCT: u64 = 70;
pub const TREASURY_FEE_PCT: u64 = 20;
pub const PERMANENT_BURN_PCT: u64 = 10;

/// Refund percentage on failure
pub const REFUND_PCT: u64 = 95;

/// Maximum request timeout (60 seconds)
pub const MAX_REQUEST_TIMEOUT: i64 = 60;

/// Target NSD price (micro-dollars)
pub const TARGET_PRICE_USD: u64 = 1_000; // $0.001

/// Emergency pause authority
pub const EMERGENCY_AUTHORITY: Pubkey = pubkey!("..."); // Multisig address
```

---

## 4. Error Codes

```rust
#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient NSD burn amount")]
    InsufficientBurn,
    
    #[msg("Insufficient validator stake")]
    InsufficientStake,
    
    #[msg("Invalid request status")]
    InvalidStatus,
    
    #[msg("Unauthorized")]
    Unauthorized,
    
    #[msg("Unauthorized oracle")]
    UnauthorizedOracle,
    
    #[msg("No models supported")]
    NoModelsSupported,
    
    #[msg("Program is paused")]
    ProgramPaused,
    
    #[msg("Request timeout")]
    RequestTimeout,
    
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
}
```

---

## 5. Events

```rust
#[event]
pub struct RequestCreated {
    pub request_id: [u8; 16],
    pub user: Pubkey,
    pub validator: Pubkey,
    pub amount: u64,
}

#[event]
pub struct RequestCompleted {
    pub request_id: [u8; 16],
    pub validator: Pubkey,
    pub validator_fee: u64,
    pub treasury_fee: u64,
}

#[event]
pub struct RequestRefunded {
    pub request_id: [u8; 16],
    pub user: Pubkey,
    pub refund_amount: u64,
    pub penalty: u64,
}

#[event]
pub struct ValidatorRegistered {
    pub validator: Pubkey,
    pub stake: u64,
    pub models: Vec<String>,
}

#[event]
pub struct PriceUpdated {
    pub price_usd: u64,
    pub timestamp: i64,
}

#[event]
pub struct EmergencyPaused {
    pub timestamp: i64,
}

#[event]
pub struct EmergencyUnpaused {
    pub timestamp: i64,
}
```

---

## 6. Security Considerations

### 6.1 Access Control

| Instruction | Authority | Validation |
|:------------|:----------|:-----------|
| `initialize` | Program deployer | One-time only, immutable after |
| `burn_for_request` | User wallet | Verify token balance |
| `complete_request` | Validator | Verify validator match |
| `refund_request` | Router authority | Timeout or explicit failure |
| `register_validator` | Validator wallet | Verify NST stake transfer |
| `emergency_pause` | Multisig | Verify emergency authority |

### 6.2 Reentrancy Protection

- All CPI calls use `CpiContext::new_with_signer` for controlled invocation
- State updates happen **after** external calls where possible
- Use Anchor's built-in `#[account]` constraints for validation

### 6.3 Arithmetic Safety

```rust
// Always use checked arithmetic
let validator_fee = amount
    .checked_mul(70)
    .ok_or(ErrorCode::ArithmeticOverflow)?
    .checked_div(100)
    .ok_or(ErrorCode::ArithmeticOverflow)?;
```

### 6.4 PDA Verification

```rust
// Always verify PDAs match expected seeds
require_keys_eq!(
    request.key(),
    Pubkey::find_program_address(&[b"request", request_id.as_ref()], &program_id).0,
    ErrorCode::InvalidPDA
);
```

---

## 7. Testing Strategy

### Unit Tests
```bash
# Test individual instructions
cargo test-bpf test_burn_for_request
cargo test-bpf test_complete_request
cargo test-bpf test_refund_request
```

### Integration Tests
- **Full request lifecycle**: Burn → Complete → Fee distribution
- **Failure scenarios**: Burn → Timeout → Refund
- **Validator registration**: Stake → Register → Earn fees
- **Emergency scenarios**: Pause → Verify frozen → Unpause

### Fuzz Testing
- Random burn amounts (within valid range)
- Concurrent requests from multiple users
- Edge cases (exactly MIN_BURN_AMOUNT, maximum u64, etc.)

---

## 8. Deployment Checklist

- [ ] Deploy to devnet and run full test suite
- [ ] External security audit (1 week compressed timeline)
- [ ] Bug bounty program announced ($50K pool)
- [ ] Upgrade authority transferred to governance multisig
- [ ] Oracle integration tested (Pyth/Switchboard)
- [ ] Emergency pause mechanism tested
- [ ] Mainnet deployment with genesis params
- [ ] Monitoring dashboard configured (Anchor events)

---

## 9. Gas Optimization

### Compute Units Estimate

| Instruction | Estimated CU | Notes |
|:------------|:-------------|:------|
| `burn_for_request` | ~8,000 CU | Burn + account creation |
| `complete_request` | ~12,000 CU | 2x mint + state updates |
| `refund_request` | ~6,000 CU | 1x mint + state update |
| `register_validator` | ~10,000 CU | Account creation + stake CPI |

**Optimization Strategies:**
- Use `zero_copy` for large account data (supported models)
- Minimize account reallocations
- Batch multiple requests in single transaction where possible

---

## Implementation Timeline

| Task | Duration | Owner |
|:-----|:---------|:------|
| Write Rust program | 3 days | Solana dev |
| Unit tests | 1 day | Solana dev |
| Integration tests | 1 day | QA team |
| External audit | 7 days | Security firm |
| Devnet deployment | 1 day | DevOps |
| Mainnet deployment | 1 day | Core team |

**Total: ~14 days (parallel with other Phase 2 activities)**

---

**Last Updated:** November 30, 2025  
**Owner:** Agent 4 (Full Stack Dev) + Solana Smart Contract Team  
**Status:** Specification Complete - Ready for Implementation

**Next Step:** Design Validator Client V1.0 implementation requirements.
