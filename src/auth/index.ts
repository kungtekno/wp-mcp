/**
 * WordPress Authentication System
 * 
 * This module provides comprehensive WordPress authentication using Application Passwords
 * with built-in security features, error handling, and connection testing.
 */

// Main service
export { WordPressAuthService } from './wordpress-auth-service.js';

// Core components
export { WordPressAuthenticationManager } from './authentication-manager.js';
export { WordPressHttpClient } from './http-client.js';
export { WordPressConnectionTester } from './connection-tester.js';

// Configuration management
export { WordPressConfigLoader } from './config-loader.js';

// Utilities
export { WordPressErrorHandler } from '../utils/error-handler.js';

// Types
export * from '../types.js';