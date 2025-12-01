-- NeuroSwarm Router API: Job Queue Schema
-- This table tracks the lifecycle of every LLM inference request from submission to completion.

CREATE TABLE IF NOT EXISTS jobs (
  -- Primary Identifier
  id UUID PRIMARY KEY,

  -- Request Details
  user_wallet VARCHAR(64) NOT NULL, -- Solana address of the user who paid the fee
  prompt TEXT NOT NULL,
  model VARCHAR(32) NOT NULL,       -- e.g., 'NS-LLM-70B'
  max_tokens INT NOT NULL,          -- User-requested max response length
  nsd_burned BIGINT NOT NULL,       -- Total fee paid in lamports/units of NSD (BIGINT for precision)

  -- Transaction and Status
  burn_tx_signature VARCHAR(128),   -- Solana transaction signature confirming fee payment/burn
  status VARCHAR(20) NOT NULL,      -- queued, processing, completed, failed, refunded
  
  -- Validator Assignment
  assigned_validator VARCHAR(64),   -- ID of the Validator assigned to the job
  validator_endpoint VARCHAR(255),  -- Validator's unique URL for job posting

  -- Tracking and Metadata
  retry_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  timeout_at TIMESTAMP WITH TIME ZONE, -- The time when the job should be considered timed out
  
  -- Results
  result TEXT,                      -- Final LLM response text or a pointer to storage
  error_message TEXT
);

-- Indices for rapid lookup and management
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_validator ON jobs(assigned_validator);
-- Index for efficiently querying jobs that are past their timeout
CREATE INDEX IF NOT EXISTS idx_jobs_timeout ON jobs(timeout_at) WHERE status='processing';
