/**
 * Configuration Manager Tests
 */

import { ConfigManager } from '../../src/config/manager.js';

describe('ConfigManager', () => {
  beforeEach(() => {
    ConfigManager.clearConfig();
  });

  describe('validateSiteUrl', () => {
    it('should validate correct URLs', () => {
      expect(ConfigManager.validateSiteUrl('https://example.com')).toBe(true);
      expect(ConfigManager.validateSiteUrl('http://localhost:8080')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(ConfigManager.validateSiteUrl('not-a-url')).toBe(false);
      expect(ConfigManager.validateSiteUrl('')).toBe(false);
    });
  });

  describe('sanitizeConfig', () => {
    it('should remove sensitive information', () => {
      const config = {
        site_url: 'https://example.com',
        username: 'testuser',
        app_password: 'secret123',
        verify_ssl: true,
        timeout: 30000,
      };

      const sanitized = ConfigManager.sanitizeConfig(config);
      
      expect(sanitized).toEqual({
        site_url: 'https://example.com',
        username: 'testuser',
        verify_ssl: true,
        timeout: 30000,
        rate_limit: undefined,
      });
      expect(sanitized).not.toHaveProperty('app_password');
    });
  });
});