/**
 * Jest Test Setup
 * 
 * Global setup for Jest tests.
 */

// Set test environment variables
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };

beforeAll(() => {
  // Mock console methods during tests
  console.log = jest.fn();
  console.info = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
  console.debug = jest.fn();
});

afterAll(() => {
  // Restore original console methods
  Object.assign(console, originalConsole);
});

// Increase timeout for integration tests
jest.setTimeout(30000);