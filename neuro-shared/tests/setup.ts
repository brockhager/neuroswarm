// tests/setup.ts
// Jest setup file for neuro-shared tests

// Mock WebSocket for testing
const MockWebSocket = jest.fn().mockImplementation(() => ({
  readyState: 1,
  onopen: null,
  onmessage: null,
  onerror: null,
  onclose: null,
  close: jest.fn(),
  send: jest.fn()
}));

// Add static properties to the mock constructor
Object.assign(MockWebSocket, {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
});

global.WebSocket = MockWebSocket as any;