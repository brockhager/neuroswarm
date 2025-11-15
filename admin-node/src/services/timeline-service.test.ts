import { TimelineService } from './timeline-service';
import { promises as fs } from 'fs';
import * as path from 'path';

describe('TimelineService', () => {
  const testTimelinePath = path.join(__dirname, 'test-timeline.jsonl');
  const testAlertsPath = path.join(__dirname, 'test-alerts.jsonl');
  let timelineService: TimelineService;

  beforeEach(async () => {
    // Ensure no private key is loaded for testing
    process.env.GOVERNANCE_PRIVATE_KEY_PATH = '/nonexistent/path';

    // Clean up any existing test file
    try {
      await fs.unlink(testTimelinePath);
      await fs.unlink(testAlertsPath);
    } catch (err) {
      // File doesn't exist, continue
    }

    timelineService = new TimelineService(console, testTimelinePath, testAlertsPath);
  });

  afterEach(async () => {
    // Clean up test file
    try {
      await fs.unlink(testTimelinePath);
      await fs.unlink(testAlertsPath);
    } catch (err) {
      // File doesn't exist, continue
    }
  });

  test('should add and retrieve timeline entries', () => {
    const entry = {
      timestamp: new Date().toISOString(),
      action: 'genesis' as const,
      actor: 'founder',
      txSignature: 'test-tx-sig',
      memoContent: 'Test genesis anchor',
      fingerprints: {
        genesis_sha256: 'abc123',
        founder_pub_sha256: 'def456'
      },
      verificationStatus: 'verified' as const,
      details: { operation: 'anchor_genesis' }
    };

    timelineService.addAnchorEntry(entry);

    const entries = timelineService.getTimelineEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe('genesis');
    expect(entries[0].actor).toBe('founder');
    expect(entries[0].txSignature).toBe('test-tx-sig');
    // Signature is undefined in test environment (no private key)
    expect(entries[0].signature).toBeUndefined();
  });

  test('should add and resolve alerts', () => {
    const alert = {
      timestamp: new Date().toISOString(),
      type: 'verification_failure' as const,
      severity: 'critical' as const,
      title: 'Test Alert',
      message: 'This is a test alert',
      resolved: false
    };

    const alertId = timelineService.addAlert(alert);
    expect(alertId).toBeDefined();

    let alerts = timelineService.getAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('critical');
    expect(alerts[0].resolved).toBe(false);

    timelineService.resolveAlert(alertId, 'Test resolution');

    alerts = timelineService.getAlerts({ resolved: false });
    expect(alerts).toHaveLength(0); // Only unresolved alerts

    const allAlerts = timelineService.getAlerts();
    expect(allAlerts).toHaveLength(1);
    expect(allAlerts[0].resolved).toBe(true);
    expect(allAlerts[0].resolution).toBe('Test resolution');
  });

  test('should filter timeline entries', () => {
    // Add multiple entries
    timelineService.addAnchorEntry({
      timestamp: new Date().toISOString(),
      action: 'genesis',
      actor: 'founder',
      txSignature: 'genesis-tx',
      memoContent: 'Genesis anchor',
      fingerprints: { genesis_sha256: 'abc' },
      verificationStatus: 'verified',
      details: {}
    });

    timelineService.addAnchorEntry({
      timestamp: new Date().toISOString(),
      action: 'key-rotation',
      actor: 'admin',
      txSignature: 'rotation-tx',
      memoContent: 'Key rotation',
      fingerprints: { key_sha256: 'def' },
      verificationStatus: 'verified',
      details: {}
    });

    // Filter by action
    const genesisEntries = timelineService.getTimelineEntries({ action: 'genesis' });
    expect(genesisEntries).toHaveLength(1);
    expect(genesisEntries[0].action).toBe('genesis');

    // Filter by actor
    const founderEntries = timelineService.getTimelineEntries({ actor: 'founder' });
    expect(founderEntries).toHaveLength(1);
    expect(founderEntries[0].actor).toBe('founder');
  });

  test('should add a submission timeline entry', () => {
    const submissionId = timelineService.addSubmissionEntry({
      timestamp: new Date().toISOString(),
      action: 'submission',
      actor: 'contributor-1',
      fingerprints: { submission_sha256: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef' },
      verificationStatus: 'pending',
      details: { submissionType: 'file' },
      contributorId: 'contributor-1',
      submissionType: 'file',
      sha256: 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      anchored: false,
    });

    expect(submissionId).toBeDefined();

    const entries = timelineService.getTimelineEntries();
    const found = entries.find(e => e.id === submissionId);
    expect(found).toBeDefined();
    expect(found?.action).toBe('submission');
    expect((found as any).contributorId).toBe('contributor-1');
    expect((found as any).sha256).toBe('deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef');
  });

  test('should set tx signature and verify an entry by genesis hash or id', () => {
    const fingerprint = { genesis_sha256: 'verify-123' };

    const id = timelineService.addAnchorEntry({
      timestamp: new Date().toISOString(),
      action: 'genesis',
      actor: 'founder',
      txSignature: undefined,
      memoContent: 'Genesis anchor',
      fingerprints: fingerprint,
      verificationStatus: 'pending',
      details: {}
    });

    // Set by genesis hash
    const result1 = timelineService.setEntryTxSignature('tx-12345', { genesisSha256: 'verify-123', verifyIfMatching: true });
    expect(result1).toBe(true);

    const entries1 = timelineService.getTimelineEntries();
    const found = entries1.find(e => e.id === id);
    expect(found).toBeDefined();
    expect(found?.txSignature).toBe('tx-12345');
    expect(found?.verificationStatus).toBe('verified');

    // Reset verification to pending and set by id
    timelineService.updateAnchorVerification(id, 'pending');
    const result2 = timelineService.setEntryTxSignature('tx-67890', { id, verifyIfMatching: false });
    expect(result2).toBe(true);

    const updated = timelineService.getTimelineEntry(id);
    expect(updated?.txSignature).toBe('tx-67890');
    expect(updated?.verificationStatus).toBe('pending');
  });
});