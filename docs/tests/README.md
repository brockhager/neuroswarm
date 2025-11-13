# NeuroSwarm Test Suite

This directory contains all test files for the NeuroSwarm project. Tests are organized by component and include unit, integration, and end-to-end validation.

## 📋 Test Organization

### Directory Structure
```
tests/
├── governance/          # Governance system tests
├── scripts/            # Script validation tests
├── integration/        # Cross-component tests
├── e2e/               # End-to-end tests
└── utils/             # Test utilities and helpers
```

### Test Categories

#### Governance Tests (`tests/governance/`)
- **Purpose**: Validate governance mechanics, voting, proposals, incentives
- **Framework**: Jest/TypeScript for logic, custom validation for blockchain
- **Coverage**: Proposal lifecycle, quorum calculation, badge incentives

#### Script Tests (`tests/scripts/`)
- **Purpose**: Validate automation scripts functionality
- **Framework**: Pester (PowerShell), pytest (Python), custom (Bash)
- **Coverage**: WordPress publishing, content sync, validation scripts

#### Integration Tests (`tests/integration/`)
- **Purpose**: Validate component interactions
- **Framework**: Custom test runners with API mocking
- **Coverage**: Web ↔ Services ↔ Blockchain communication

#### E2E Tests (`tests/e2e/`)
- **Purpose**: Full user journey validation
- **Framework**: Playwright/Cypress for web, custom for CLI
- **Coverage**: Complete workflows from user action to blockchain

## 🧪 Running Tests

### Prerequisites
```bash
# Install dependencies
npm install
pip install -r requirements-test.txt
```

### Governance Tests
```bash
# Run all governance tests
npm test -- tests/governance/

# Run specific test
npx jest tests/governance/badge-incentives.test.ts

# With coverage
npm test -- --coverage tests/governance/
```

### Script Tests
```bash
# Python script tests
python -m pytest tests/scripts/ -v

# PowerShell script tests
Invoke-Pester tests/scripts/ -Output Detailed

# Bash script tests
bash tests/scripts/test-setup.sh
```

### Integration Tests
```bash
# Run integration suite
npm run test:integration

# With environment
NODE_ENV=test npm run test:integration
```

### E2E Tests
```bash
# Web E2E tests
npx playwright test tests/e2e/

# CLI E2E tests
bash tests/e2e/run-cli-tests.sh
```

## 📝 Writing Tests

### Governance Tests
```typescript
// tests/governance/proposal-lifecycle.test.ts
import { GovernanceService } from '../../src/governance/governance';
import { badgeIncentivesService } from '../../src/governance/badge-incentives';

describe('Proposal Lifecycle', () => {
  let governance: GovernanceService;

  beforeEach(() => {
    governance = new GovernanceService();
  });

  test('should create proposal successfully', async () => {
    const proposalId = await governance.submitProposal(
      mockWallet,
      'Test Proposal',
      'Description',
      'Technical',
      [],
      ['test']
    );

    expect(proposalId).toBeDefined();
  });

  test('should calculate incentives correctly', () => {
    const incentives = badgeIncentivesService.calculateVoteReward(
      'voter1',
      'prop1',
      'Bronze',
      new Date(),
      true,
      false
    );

    expect(incentives.totalReward).toBeGreaterThan(0);
  });
});
```

### Script Tests
```python
# tests/scripts/test_wp_publisher.py
import pytest
from scripts.wp_publisher import WordPressPublisher

class TestWordPressPublisher:
    def test_publish_content(self, mock_wp_api):
        publisher = WordPressPublisher()
        result = publisher.publish_content({
            'title': 'Test',
            'content': 'Test content',
            'status': 'draft'
        })

        assert result['id'] is not None
        mock_wp_api.post.assert_called_once()

    def test_connection_test(self):
        publisher = WordPressPublisher()
        assert publisher.test_connection() == True
```

### PowerShell Tests
```powershell
# tests/scripts/SyncAgent.Tests.ps1
Describe "Sync Agent" {
    Context "File Operations" {
        It "Should move files correctly" {
            $result = .\scripts\sync-agent.ps1 -Sync -WhatIf
            $result | Should -Not -BeNullOrEmpty
        }

        It "Should log operations" {
            $logPath = "wp_publish_log.jsonl"
            $initialCount = Get-Content $logPath | Measure-Object | Select-Object -ExpandProperty Count

            # Run operation
            .\scripts\sync-agent.ps1 -Sync

            $finalCount = Get-Content $logPath | Measure-Object | Select-Object -ExpandProperty Count
            $finalCount | Should -BeGreaterThan $initialCount
        }
    }
}
```

## 🎯 Test Standards

### Naming Convention
- **Files**: `*.test.ts`, `*.spec.ts`, `*.Tests.ps1`, `test_*.py`
- **Functions**: `describe('Component', () => { it('should do something', () => {})`
- **Coverage**: Aim for 80%+ coverage on critical paths

### Best Practices
- **Isolation**: Each test should be independent
- **Mocking**: Use mocks for external dependencies
- **Cleanup**: Clean up test data and files
- **Documentation**: Document complex test scenarios
- **CI Integration**: All tests must pass in CI

### Test Data
- Use `tests/utils/test-data/` for shared test fixtures
- Generate unique IDs for test entities
- Clean up test blockchain state

## 🚀 CI Integration

Tests run automatically on:
- **Pull Requests**: All test suites
- **Merges to master**: Full test suite with coverage
- **Nightly**: Extended integration and E2E tests

### Local CI Simulation
```bash
# Run full CI test suite
npm run ci:test

# Run with coverage reporting
npm run ci:test:coverage
```

## 📊 Coverage Reporting

Coverage reports are generated for:
- TypeScript/JavaScript: Istanbul/NYC
- Python: Coverage.py
- PowerShell: Pester coverage (custom)

View reports at `coverage/lcov-report/index.html`

## 🐛 Debugging Tests

### Common Issues
- **Import Errors**: Check tsconfig paths and module resolution
- **Async Tests**: Ensure proper awaiting of promises
- **Mock Setup**: Verify mock implementations match real APIs
- **Environment**: Test in same environment as production

### Debug Mode
```bash
# Debug specific test
DEBUG=test npx jest tests/governance/ --verbose

# Debug PowerShell tests
$DebugPreference = "Continue"
Invoke-Pester tests/scripts/ -Debug
```

## 📝 Contributing Tests

1. **Identify Test Type**: Unit, integration, or E2E
2. **Follow Naming**: Use descriptive test names
3. **Add Coverage**: Ensure new code has corresponding tests
4. **Update CI**: Add to CI pipeline if long-running
5. **Document**: Update this README for new test categories

## 🔧 Test Infrastructure

### Shared Utilities
- `tests/utils/mock-wallet.ts`: Blockchain wallet mocking
- `tests/utils/test-db.ts`: Test database setup
- `tests/utils/api-mock.ts`: API response mocking

### Environment Setup
- `tests/setup.ts`: Global test configuration
- `tests/teardown.ts`: Cleanup procedures
- `.test.env`: Test environment variables

---

*Ensure all tests pass before merging. Use `npm run test:watch` for development.*