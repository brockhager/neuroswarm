import { safetyService } from './safety-service';

describe('SafetyService', () => {
  beforeEach(() => {
    // Ensure safe mode is reset between tests
    safetyService.setSafeMode(false);
  });

  test('initially not in safe mode', () => {
    expect(safetyService.isSafe()).toBe(false);
  });

  test('enable and disable safe mode', () => {
    expect(safetyService.setSafeMode(true)).toBe(true);
    expect(safetyService.isSafe()).toBe(true);
    expect(safetyService.setSafeMode(false)).toBe(false);
    expect(safetyService.isSafe()).toBe(false);
  });
});
