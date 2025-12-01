import AlertingService from '../src/services/alerting';

describe('AlertingService', () => {
    beforeEach(() => {
    jest.resetModules();
    // reset global fetch mock
    (global as any).fetch = undefined;
    delete process.env.SLACK_ALERT_WEBHOOK;
  });

  test('logs when no webhook configured (mock mode)', async () => {
    const svc = new AlertingService();
    const spyErr = jest.spyOn(console, 'error').mockImplementation(() => {});
    await svc.dispatch({ priority: 'HIGH', title: 'Test', details: 'no webhook' });
    expect(spyErr).toHaveBeenCalled();
    spyErr.mockRestore();
  });

  test('posts to Slack when webhook configured', async () => {
    process.env.SLACK_ALERT_WEBHOOK = 'https://example.org/webhook';

    // Mock global fetch to simulate 200 OK
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, status: 200 });

    // Re-import the module under env var and create a new instance
    jest.resetModules();
    const Alerting = require('../src/services/alerting').default;
    const svc = new Alerting();

    await svc.dispatch({ priority: 'CRITICAL', title: 'Big failure', details: 'something broke', tags: ['refund'] });

    expect((fetch as jest.MockedFunction<any>).mock.calls.length).toBeGreaterThan(0);
    const [url, opts] = (fetch as jest.MockedFunction<any>).mock.calls[0];
    expect(url).toBe('https://example.org/webhook');
    expect(opts.method).toBe('POST');
    const body = JSON.parse(opts.body);
    expect(body.text).toContain('Big failure');
  });
});
