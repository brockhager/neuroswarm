import { ReputationService } from './reputation-service';
import fs from 'fs';
import path from 'path';

describe('ReputationService', () => {
  const pathToStore = path.join(__dirname, 'test-reputation.json');
  let service: ReputationService;

  beforeEach(() => {
    try { fs.unlinkSync(pathToStore); } catch (e) { }
    service = new ReputationService(pathToStore);
  });

  afterEach(() => {
    try { fs.unlinkSync(pathToStore); } catch (e) { }
  });

  test('add and read reputation', () => {
    service.addReputation('alice', 10, 'submission');
    expect(service.getReputation('alice')).toBe(10);
    service.addReputation('alice', 5, 'review');
    expect(service.getReputation('alice')).toBe(15);
  });
});
