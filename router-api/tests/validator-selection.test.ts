import { ValidatorSelectionService } from '../src/services/validator-selection';

describe('ValidatorSelectionService', () => {
  const svc = new ValidatorSelectionService();

  test('selects validator with highest combined score', () => {
    const validators = [
      { id: 'a', endpoint: '', wallet_address: '', stake: 1000, reputation: 80, latency_ms: 50, capacity_used: 1, max_capacity: 5, last_active: new Date() },
      { id: 'b', endpoint: '', wallet_address: '', stake: 9000, reputation: 50, latency_ms: 10, capacity_used: 0, max_capacity: 10, last_active: new Date() },
      { id: 'c', endpoint: '', wallet_address: '', stake: 500, reputation: 90, latency_ms: 2000, capacity_used: 0, max_capacity: 2, last_active: new Date() }
    ];

    const chosen = svc.selectBestValidator(validators);
    expect(chosen).not.toBeNull();
    // a's reputation + capacity slightly outweighs b's stake in the weighting
    expect(chosen?.id).toBe('a');
  });

  test('returns null when all validators busy or inactive', () => {
    const validators = [
      { id: 'a', endpoint: '', wallet_address: '', stake: 1000, reputation: 80, latency_ms: 50, capacity_used: 5, max_capacity: 5, last_active: new Date(Date.now() - 120000) },
    ];
    const chosen = svc.selectBestValidator(validators);
    expect(chosen).toBeNull();
  });
});
