-- Migration: 001 - Add Refund Alert/Retry Persistence Columns
-- Author: NeuroSwarm Agent 6
-- Date: 2025-12-01

DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jobs') THEN

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='refund_retry_count') THEN
            ALTER TABLE jobs ADD COLUMN refund_retry_count INTEGER DEFAULT 0;
            COMMENT ON COLUMN jobs.refund_retry_count IS 'Counter for physical refund TX submission attempts.';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='refund_last_attempt_at') THEN
            ALTER TABLE jobs ADD COLUMN refund_last_attempt_at TIMESTAMP WITHOUT TIME ZONE;
            COMMENT ON COLUMN jobs.refund_last_attempt_at IS 'Timestamp of the last refund TX submission attempt.';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='refund_alert_count') THEN
            ALTER TABLE jobs ADD COLUMN refund_alert_count INTEGER DEFAULT 0;
            COMMENT ON COLUMN jobs.refund_alert_count IS 'How many times a CRITICAL alert has been sent for this job.';
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='jobs' AND column_name='refund_last_alert_at') THEN
            ALTER TABLE jobs ADD COLUMN refund_last_alert_at TIMESTAMP WITHOUT TIME ZONE;
            COMMENT ON COLUMN jobs.refund_last_alert_at IS 'Timestamp of the last CRITICAL refund alert dispatched.';
        END IF;

        CREATE INDEX IF NOT EXISTS idx_refund_alert_at ON jobs (refund_last_alert_at);
        CREATE INDEX IF NOT EXISTS idx_refund_retry_count ON jobs (refund_retry_count);

    END IF;
END $$;
