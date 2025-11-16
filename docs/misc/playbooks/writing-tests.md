# Contributor Playbook: Writing Tests

This playbook guides you through writing comprehensive tests for the NeuroSwarm platform, ensuring code quality and preventing regressions.

## Overview

Testing Strategy:
- **Unit Tests:** Individual functions and modules
- **Integration Tests:** API endpoints and service interactions
- **End-to-End Tests:** Complete user workflows
- **Performance Tests:** Load and stress testing

## Prerequisites

- [x] Completed [Getting Started](../../getting-started.md)
- [x] Familiar with [Development Workflow](../../development.md)
- [x] Understanding of [Services Architecture](../../services.md)
- [x] Local development environment running

## Step 1: Understand Testing Framework

### 1.1 Review Current Test Setup
```bash
# Check test configuration
cd neuro-services
cat package.json | grep -A 10 "scripts"

# Examine test files
find . -name "*.test.ts" -o -name "*.spec.ts"
```

### 1.2 Test Dependencies
```json
// package.json test dependencies
{
  "devDependencies": {
    "@types/jest": "^29.5.0",
    "@types/supertest": "^2.0.12",
    "jest": "^29.5.0",
    "supertest": "^6.3.3",
    "ts-jest": "^29.1.0"
  }
}
```

### 3.3 Run Existing Tests
```bash
pnpm -C neuro-services test
pnpm -C neuro-services run test:watch
pnpm -C neuro-services run test:coverage
```

## Step 2: Plan Your Test Coverage

### 2.1 Identify Test Gaps
```bash
# Check current coverage
npm run test:coverage

# Find untested files
find src -name "*.ts" | grep -v ".test.ts" | xargs -I {} sh -c 'echo "Checking {}"; [ -f "${0%.ts}.test.ts" ] && echo "✅ Has test" || echo "❌ Missing test"'
```

### 2.2 Define Test Scenarios
Choose what to test:
- [ ] New feature functionality
- [ ] Error handling and edge cases
- [ ] API endpoint validation
- [ ] Data validation and sanitization
- [ ] Performance under load
- [ ] Integration with external services

## Step 3: Write Unit Tests

### 3.1 Create Test File Structure
```bash
# For a new module src/auth.ts
touch src/auth.test.ts

# For API routes
touch src/routes/auth.test.ts
```

### 3.2 Basic Unit Test Template
```typescript
// src/auth.test.ts
import { authenticateUser, generateToken } from './auth';

describe('Authentication Module', () => {
  describe('authenticateUser', () => {
    it('should authenticate valid credentials', async () => {
      const result = await authenticateUser('user@example.com', 'password123');
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.token).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
      const result = await authenticateUser('user@example.com', 'wrongpassword');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
    });

    it('should handle non-existent users', async () => {
      const result = await authenticateUser('nonexistent@example.com', 'password');
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
    });
  });

  describe('generateToken', () => {
    it('should generate valid JWT token', () => {
      const user = { id: '123', email: 'user@example.com' };
      const token = generateToken(user);

      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should include user data in token', () => {
      const user = { id: '123', email: 'user@example.com', role: 'admin' };
      const token = generateToken(user);

      // Decode token payload (simplified)
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
      expect(payload.id).toBe(user.id);
      expect(payload.email).toBe(user.email);
    });
  });
});
```

### 3.3 Mock External Dependencies
```typescript
// Mock database calls
jest.mock('../database', () => ({
  findUser: jest.fn(),
  saveUser: jest.fn(),
}));

// Mock external API calls
jest.mock('axios');
import axios from 'axios';

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('External API Integration', () => {
  beforeEach(() => {
    mockedAxios.get.mockClear();
  });

  it('should fetch user data from external API', async () => {
    const mockUserData = { id: 1, name: 'John Doe' };
    mockedAxios.get.mockResolvedValue({ data: mockUserData });

    const result = await fetchUserData(1);

    expect(mockedAxios.get).toHaveBeenCalledWith('/api/users/1');
    expect(result).toEqual(mockUserData);
  });
});
```

## Step 4: Write Integration Tests

### 4.1 API Endpoint Testing
```typescript
// src/routes/auth.test.ts
import request from 'supertest';
import { app } from '../app';

describe('Authentication Routes', () => {
  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.headers['set-cookie']).toBeDefined();
    });

    it('should return 401 for invalid credentials', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('email');
      expect(response.body.error).toContain('password');
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user with valid token', async () => {
      const loginResponse = await request(app)
        .post('/auth/login')
        .send({
          email: 'user@example.com',
          password: 'password123'
        });

      const token = loginResponse.body.token;

      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe('user@example.com');
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/auth/me');

      expect(response.status).toBe(401);
    });
  });
});
```

### 4.2 Database Integration Tests
```typescript
// Test database operations
describe('User Repository', () => {
  beforeEach(async () => {
    // Clean up test database
    await User.deleteMany({});
  });

  it('should create and retrieve user', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'hashedpassword',
      role: 'user'
    };

    const createdUser = await User.create(userData);
    const retrievedUser = await User.findById(createdUser._id);

    expect(retrievedUser.email).toBe(userData.email);
    expect(retrievedUser.role).toBe(userData.role);
  });

  it('should enforce unique email constraint', async () => {
    await User.create({
      email: 'duplicate@example.com',
      password: 'password1'
    });

    await expect(User.create({
      email: 'duplicate@example.com',
      password: 'password2'
    })).rejects.toThrow();
  });
});
```

## Step 5: Write End-to-End Tests

### 5.1 Complete User Workflow
```typescript
// e2e/user-workflow.test.ts
import request from 'supertest';
import { app } from '../src/app';

describe('User Registration and Login Workflow', () => {
  const testUser = {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    name: 'Test User'
  };

  it('should complete full user registration and login flow', async () => {
    // 1. Register user
    const registerResponse = await request(app)
      .post('/auth/register')
      .send(testUser);

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.success).toBe(true);

    // 2. Login with new credentials
    const loginResponse = await request(app)
      .post('/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toBeDefined();

    const token = loginResponse.body.token;

    // 3. Access protected route
    const profileResponse = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.user.email).toBe(testUser.email);

    // 4. Logout
    const logoutResponse = await request(app)
      .post('/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(logoutResponse.status).toBe(200);

    // 5. Verify token is invalidated
    const afterLogoutResponse = await request(app)
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(afterLogoutResponse.status).toBe(401);
  });
});
```

### 5.2 Cross-Service Integration
```typescript
// Test interaction between services
describe('Cross-Service Integration', () => {
  it('should sync data between indexer and storage', async () => {
    // Upload content to storage service
    const uploadResponse = await request(storageApp)
      .post('/storage/upload')
      .attach('file', Buffer.from('test content'), 'test.txt');

    expect(uploadResponse.status).toBe(201);
    const contentId = uploadResponse.body.id;

    // Wait for indexing (in real scenario, use message queue)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify content appears in search
    const searchResponse = await request(indexerApp)
      .get('/index/search')
      .query({ q: 'test content' });

    expect(searchResponse.status).toBe(200);
    expect(searchResponse.body.results.some((r: any) => r.id === contentId)).toBe(true);
  });
});
```

## Step 6: Performance and Load Testing

### 6.1 Response Time Tests
```typescript
// performance/auth-performance.test.ts
describe('Authentication Performance', () => {
  it('should respond within acceptable time limits', async () => {
    const startTime = Date.now();

    const response = await request(app)
      .post('/auth/login')
      .send({
        email: 'user@example.com',
        password: 'password123'
      });

    const responseTime = Date.now() - startTime;

    expect(response.status).toBe(200);
    expect(responseTime).toBeLessThan(500); // 500ms limit
  });
});
```

### 6.2 Load Testing Setup
```yaml
# load-test.yml (using Artillery)
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: 'Warm up'
    - duration: 120
      arrivalRate: 50
      name: 'Load test'
scenarios:
  - name: 'User authentication'
    weight: 70
    requests:
      - post:
          url: '/auth/login'
          json:
            email: 'user@example.com'
            password: 'password123'
  - name: 'Search requests'
    weight: 30
    requests:
      - get:
          url: '/index/search'
          qs:
            q: 'neural'
```

### 6.3 Run Load Tests
```bash
# Install Artillery
npm install -g artillery

# Run load test
artillery run load-test.yml

# Generate report
artillery report report.json
```

## Step 7: Test Configuration and CI/CD

### 7.1 Jest Configuration
```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.ts',
    '**/*.test.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts' // Entry point
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterEnv: ['<rootDir>/src/test-setup.ts']
};
```

### 7.2 Test Setup File
```typescript
// src/test-setup.ts
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
```

### 7.3 CI/CD Integration
```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
```

## Step 8: Test Documentation and Maintenance

### 8.1 Document Test Cases
```typescript
/**
 * Authentication Module Tests
 *
 * Test Coverage:
 * - ✅ Valid user authentication
 * - ✅ Invalid credential rejection
 * - ✅ Token generation and validation
 * - ✅ Password hashing security
 * - ✅ Rate limiting for brute force protection
 * - ✅ Session management and expiration
 *
 * Edge Cases:
 * - Network timeouts during authentication
 * - Concurrent login attempts
 * - Token revocation scenarios
 * - Database connection failures
 */
describe('Authentication Module', () => {
  // ... test implementations
});
```

### 8.2 Test Maintenance
```bash
# Run tests on file changes
pnpm -C neuro-services run test:watch

# Update snapshots (if using snapshot testing)
pnpm -C neuro-services test -- --updateSnapshot

# Check for flaky tests
npm run test -- --testNamePattern="flaky" --verbose

# Performance regression testing
npm run test:performance
```

## Troubleshooting

### Common Issues

**❌ Tests failing intermittently:**
```typescript
// Add retry logic for flaky tests
function retryTest(fn: () => Promise<void>, retries = 3) {
  return async () => {
    for (let i = 0; i < retries; i++) {
      try {
        await fn();
        return;
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  };
}
```

**❌ Mock not working correctly:**
```typescript
// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Verify mock calls
expect(mockFunction).toHaveBeenCalledWith(expectedArgs);
expect(mockFunction).toHaveBeenCalledTimes(1);
```

**❌ Database tests failing:**
```typescript
// Ensure proper cleanup
afterEach(async () => {
  await User.deleteMany({});
  await mongoose.connection.db.dropDatabase();
});
```

## Success Criteria

✅ **Coverage meets threshold:** >80% code coverage
✅ **All tests pass:** Unit, integration, and E2E
✅ **Performance acceptable:** Response times under 500ms
✅ **CI/CD integrated:** Tests run automatically
✅ **Documentation complete:** Test cases documented

## Next Steps

- [ ] Add property-based testing with fast-check
- [ ] Implement visual regression tests for UI components
- [ ] Set up chaos engineering tests
- [ ] Create performance benchmarking suite
- [ ] Add accessibility testing

---

**Time Estimate:** 2-6 hours depending on complexity
**Difficulty:** Beginner to Advanced (varies by test type)
**Impact:** Ensures code reliability and prevents regressions