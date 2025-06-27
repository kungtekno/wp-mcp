import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { 
  WordPressConfig, 
  WordPressConfigSchema, 
  WordPressAuthError, 
  AuthErrorType 
} from '../types.js';

/**
 * WordPress Configuration Loader
 * Loads configuration from multiple sources with proper precedence
 */
export class WordPressConfigLoader {
  private loadedConfig: WordPressConfig | null = null;
  private configSource: string | null = null;

  /**
   * Loads WordPress configuration from available sources
   */
  public async loadConfig(): Promise<WordPressConfig> {
    // Try loading from environment variables first
    const envConfig = this.loadFromEnvironment();
    if (envConfig) {
      this.configSource = 'environment_variables';
      this.loadedConfig = envConfig;
      return envConfig;
    }

    throw new WordPressAuthError(
      AuthErrorType.INVALID_CREDENTIALS,
      'No WordPress configuration found. Please set environment variables or create a config file.'
    );
  }

  /**
   * Loads configuration from environment variables
   */
  private loadFromEnvironment(): WordPressConfig | null {
    const requiredEnvVars = {
      site_url: process.env.WORDPRESS_SITE_URL || process.env.WP_SITE_URL,
      username: process.env.WORDPRESS_USERNAME || process.env.WP_USERNAME,
      app_password: process.env.WORDPRESS_APP_PASSWORD || process.env.WP_APP_PASSWORD
    };

    // Check if all required environment variables are present
    if (!requiredEnvVars.site_url || !requiredEnvVars.username || !requiredEnvVars.app_password) {
      return null;
    }

    const config: WordPressConfig = {
      site_url: requiredEnvVars.site_url,
      username: requiredEnvVars.username,
      app_password: requiredEnvVars.app_password,
      verify_ssl: this.parseBoolean(process.env.WORDPRESS_VERIFY_SSL || process.env.WP_VERIFY_SSL, true),
      timeout: this.parseNumber(process.env.WORDPRESS_TIMEOUT || process.env.WP_TIMEOUT, 30000) || 30000
    };

    // Add rate limiting configuration if specified
    const rateLimitRpm = this.parseNumber(process.env.WORDPRESS_RATE_LIMIT_RPM, undefined);
    const rateLimitBurst = this.parseNumber(process.env.WORDPRESS_RATE_LIMIT_BURST, undefined);
    
    if (rateLimitRpm !== undefined || rateLimitBurst !== undefined) {
      config.rate_limit = {
        requests_per_minute: rateLimitRpm || 60,
        burst_limit: rateLimitBurst || 10
      };
    }

    return this.validateAndSanitizeConfig(config);
  }

  /**
   * Validates and sanitizes the configuration
   */
  private validateAndSanitizeConfig(config: any): WordPressConfig {
    try {
      // Validate using Zod schema
      const validatedConfig = WordPressConfigSchema.parse(config);
      
      // Additional sanitization
      validatedConfig.site_url = validatedConfig.site_url.replace(/\/$/, ''); // Remove trailing slash
      validatedConfig.app_password = validatedConfig.app_password.trim();
      validatedConfig.username = validatedConfig.username.trim();
      
      return validatedConfig;
      
    } catch (error) {
      throw new WordPressAuthError(
        AuthErrorType.INVALID_CREDENTIALS,
        `Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Parses a string to boolean with default value
   */
  private parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) {
      return defaultValue;
    }
    
    const lowercaseValue = value.toLowerCase();
    return lowercaseValue === 'true' || lowercaseValue === '1' || lowercaseValue === 'yes';
  }

  /**
   * Parses a string to number with default value
   */
  private parseNumber(value: string | undefined, defaultValue?: number): number | undefined {
    if (value === undefined) {
      return defaultValue;
    }
    
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  /**
   * Gets the source of the loaded configuration
   */
  public getConfigSource(): string | null {
    return this.configSource;
  }

  /**
   * Gets the loaded configuration (sanitized)
   */
  public getLoadedConfig(): Omit<WordPressConfig, 'app_password'> | null {
    if (!this.loadedConfig) {
      return null;
    }
    
    const { app_password, ...sanitizedConfig } = this.loadedConfig;
    return sanitizedConfig;
  }

  /**
   * Creates a sample configuration file content
   */
  public static createSampleConfig(): string {
    const sampleConfig = {
      wordpress: {
        site_url: "https://your-wordpress-site.com",
        username: "your-username",
        app_password: "xxxx xxxx xxxx xxxx xxxx xxxx", 
        verify_ssl: true,
        timeout: 30000,
        rate_limit: {
          requests_per_minute: 60,
          burst_limit: 10
        }
      }
    };
    
    return JSON.stringify(sampleConfig, null, 2);
  }

  /**
   * Gets environment variable setup instructions
   */
  public static getEnvironmentSetupInstructions(): string {
    return `
Environment Variable Setup:

Required:
  WORDPRESS_SITE_URL=https://your-wordpress-site.com
  WORDPRESS_USERNAME=your-username  
  WORDPRESS_APP_PASSWORD="xxxx xxxx xxxx xxxx xxxx xxxx"

Optional:
  WORDPRESS_VERIFY_SSL=true
  WORDPRESS_TIMEOUT=30000
  WORDPRESS_RATE_LIMIT_RPM=60
  WORDPRESS_RATE_LIMIT_BURST=10

Alternative environment variable names:
  WP_SITE_URL, WP_USERNAME, WP_APP_PASSWORD, WP_VERIFY_SSL, WP_TIMEOUT
`;
  }

  /**
   * Validates if a configuration is properly set up
   */
  public static async validateSetup(): Promise<{
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];
    
    try {
      const loader = new WordPressConfigLoader();
      await loader.loadConfig();
      
      return {
        isValid: true,
        issues: [],
        suggestions: ['Configuration loaded successfully']
      };
      
    } catch (error) {
      if (error instanceof WordPressAuthError) {
        issues.push(error.message);
        suggestions.push('Set up environment variables or create a config file');
      } else {
        issues.push('Unknown configuration error');
      }
      
      return {
        isValid: false,
        issues,
        suggestions
      };
    }
  }
}