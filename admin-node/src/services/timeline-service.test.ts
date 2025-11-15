import { TimelineService } from './timeline-service';
import { promises as fs } from 'fs';
import * as path from 'path';

describe('TimelineService', () => {
  const testTimelinePath = path.join(__dirname, 'test-timeline.jsonl');
  const testAlertsPath = path.join(__dirname, 'test-alerts.jsonl');
  let timelineService: TimelineService;

  beforeEach(async () => {
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

  test('should add and retrieve timeline entries', async () => {
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

    await timelineService.addAnchorEntry(entry);

    const entries = await timelineService.getTimelineEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe('genesis');
    expect(entries[0].actor).toBe('founder');
    expect(entries[0].txSignature).toBe('test-tx-sig');
    // Signature is undefined in test environment (no private key)
    expect(entries[0].signature).toBeUndefined();
  });

  test('should add and resolve alerts', async () => {
    const alert = {
      timestamp: new Date().toISOString(),
      type: 'verification_failure' as const,
      severity: 'critical' as const,
      title: 'Test Alert',
      message: 'This is a test alert',
      resolved: false
    };

    const alertId = await timelineService.addAlert(alert);
    expect(alertId).toBeDefined();

    let alerts = await timelineService.getAlerts();
    expect(alerts).toHaveLength(1);
    expect(alerts[0].severity).toBe('critical');
    expect(alerts[0].resolved).toBe(false);

    await timelineService.resolveAlert(alertId, 'Test resolution');

    alerts = await timelineService.getAlerts({ resolved: false });
    expect(alerts).toHaveLength(0); // Only unresolved alerts

    const allAlerts = await timelineService.getAlerts();
    expect(allAlerts).toHaveLength(1);
    expect(allAlerts[0].resolved).toBe(true);
    expect(allAlerts[0].resolution).toBe('Test resolution');
  });

  test('should filter timeline entries', async () => {
    // Add multiple entries
    await timelineService.addAnchorEntry({
      timestamp: new Date().toISOString(),
      action: 'genesis',
      actor: 'founder',
      txSignature: 'genesis-tx',
      memoContent: 'Genesis anchor',
      fingerprints: { genesis_sha256: 'abc' },
      verificationStatus: 'verified',
      details: {}
    });

    await timelineService.addAnchorEntry({
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
    const genesisEntries = await timelineService.getTimelineEntries({ action: 'genesis' });
    expect(genesisEntries).toHaveLength(1);
    expect(genesisEntries[0].action).toBe('genesis');

    // Filter by actor
    const founderEntries = await timelineService.getTimelineEntries({ actor: 'founder' });
    expect(founderEntries).toHaveLength(1);
    expect(founderEntries[0].actor).toBe('founder');
  });
});