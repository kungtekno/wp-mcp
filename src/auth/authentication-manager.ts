import { URL } from 'url';
import { 
  WordPressConfig, 
  AuthState, 
  WordPressAuthError, 
  AuthErrorType,
  ConnectionTestResult,
  SecurityValidationResult
} from '../types.js';

/**
 * WordPress Authentication Manager
 * Handles WordPress Application Passwords authentication with security features
 */
export class WordPressAuthenticationManager {
  private authState: AuthState;
  private config: WordPressConfig;
  private lastAuthCheck: Date | null = null;
  private readonly AUTH_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(config: WordPressConfig) {
    this.config = config;
    this.authState = {
      isAuthenticated: false,
      lastVerified: null,
      credentials: null
    };
    
    // Validate configuration on initialization
    this.validateConfiguration();
  }

  /**
   * Validates the WordPress configuration for security and correctness
   */
  private validateConfiguration(): void {
    const validation = this.validateSecurity();
    
    if (!validation.isSecure) {
      throw new WordPressAuthError(
        AuthErrorType.INVALID_URL,
        `Security validation failed: ${validation.issues.join(', ')}`
      );
    }

    // Validate URL format
    try {
      const url = new URL(this.config.site_url);
      if (url.protocol !== 'https:') {
        throw new WordPressAuthError(
          AuthErrorType.INVALID_URL,
          'WordPress site URL must use HTTPS for security'
        );
      }
    } catch (error) {
      throw new WordPressAuthError(
        AuthErrorType.INVALID_URL,
        `Invalid WordPress site URL: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }

    // Validate application password format
    if (!this.isValidApplicationPassword(this.config.app_password)) {
      throw new WordPressAuthError(
        AuthErrorType.INVALID_CREDENTIALS,
        'Application password format is invalid. Should be in format: xxxx xxxx xxxx xxxx xxxx xxxx'
      );
    }
  }

  /**
   * Validates if the application password has the correct format
   */
  private isValidApplicationPassword(password: string): boolean {
    // WordPress application passwords are typically 24 characters with spaces
    // Format: xxxx xxxx xxxx xxxx xxxx xxxx
    const cleanPassword = password.replace(/\s/g, '');
    return cleanPassword.length === 24 && /^[a-zA-Z0-9]+$/.test(cleanPassword);
  }

  /**
   * Validates security configuration
   */
  public validateSecurity(): SecurityValidationResult {
    const issues: string[] = [];
    const warnings: string[] = [];

    try {
      const url = new URL(this.config.site_url);
      
      // Check HTTPS requirement
      if (url.protocol !== 'https:') {
        issues.push('Site URL must use HTTPS');
      }

      // Check for localhost/development environments
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        warnings.push('Using localhost - ensure this is for development only');
      }

      // Check SSL verification setting
      if (this.config.verify_ssl === false) {
        warnings.push('SSL verification is disabled - this reduces security');
      }

      // Check timeout settings
      if (this.config.timeout > 60000) {
        warnings.push('Timeout is set very high - consider reducing for better user experience');
      }

    } catch (error) {
      issues.push('Invalid site URL format');
    }

    return {
      isSecure: issues.length === 0,
      issues,
      warnings
    };
  }

  /**
   * Generates HTTP Basic Authentication header
   */
  public generateAuthHeader(): string {
    const credentials = `${this.config.username}:${this.config.app_password}`;
    const encoded = Buffer.from(credentials).toString('base64');
    return `Basic ${encoded}`;
  }

  /**
   * Sets up authentication credentials
   */
  public async authenticate(): Promise<void> {
    try {
      // Generate and store encoded credentials
      const authHeader = this.generateAuthHeader();
      
      this.authState = {
        isAuthenticated: true,
        lastVerified: new Date(),
        credentials: {
          username: this.config.username,
          password: authHeader.replace('Basic ', '')
        }
      };

      this.lastAuthCheck = new Date();
      
    } catch (error) {
      this.authState = {
        isAuthenticated: false,
        lastVerified: null,
        credentials: null
      };
      
      throw new WordPressAuthError(
        AuthErrorType.INVALID_CREDENTIALS,
        'Failed to set up authentication',
        undefined,
        error instanceof Error ? error : new Error('Unknown error')
      );
    }
  }

  /**
   * Checks if authentication is still valid (with caching)
   */
  public isAuthenticated(): boolean {
    if (!this.authState.isAuthenticated) {
      return false;
    }

    // Check if we need to re-verify (cache expiration)
    if (this.lastAuthCheck && 
        Date.now() - this.lastAuthCheck.getTime() < this.AUTH_CACHE_DURATION) {
      return true;
    }

    return this.authState.isAuthenticated;
  }

  /**
   * Gets the current authentication state
   */
  public getAuthState(): Readonly<AuthState> {
    return { ...this.authState };
  }

  /**
   * Gets the Authorization header for HTTP requests
   */
  public getAuthorizationHeader(): string {
    if (!this.authState.credentials) {
      throw new WordPressAuthError(
        AuthErrorType.UNAUTHORIZED,
        'No authentication credentials available'
      );
    }
    
    return `Basic ${this.authState.credentials.password}`;
  }

  /**
   * Gets the WordPress REST API base URL
   */
  public getApiBaseUrl(): string {
    const baseUrl = this.config.site_url.replace(/\/$/, '');
    return `${baseUrl}/wp-json/wp/v2`;
  }

  /**
   * Gets the WordPress site URL
   */
  public getSiteUrl(): string {
    return this.config.site_url;
  }

  /**
   * Gets the current configuration (sanitized)
   */
  public getConfig(): Omit<WordPressConfig, 'app_password'> {
    const { app_password, ...sanitizedConfig } = this.config;
    return sanitizedConfig;
  }

  /**
   * Updates the authentication configuration
   */
  public async updateConfig(newConfig: WordPressConfig): Promise<void> {
    this.config = newConfig;
    this.validateConfiguration();
    
    // Re-authenticate with new configuration
    await this.authenticate();
  }

  /**
   * Invalidates the current authentication
   */
  public invalidateAuth(): void {
    this.authState = {
      isAuthenticated: false,
      lastVerified: null,
      credentials: null
    };
    this.lastAuthCheck = null;
  }

  /**
   * Checks if re-authentication is needed
   */
  public needsReAuth(): boolean {
    if (!this.authState.isAuthenticated) {
      return true;
    }

    if (!this.lastAuthCheck) {
      return true;
    }

    return Date.now() - this.lastAuthCheck.getTime() > this.AUTH_CACHE_DURATION;
  }

  /**
   * Sanitizes error messages to prevent credential exposure
   */
  public sanitizeErrorMessage(error: Error): string {
    let message = error.message;
    
    // Remove potential credential information
    message = message.replace(new RegExp(this.config.username, 'gi'), '[USERNAME]');
    message = message.replace(new RegExp(this.config.app_password, 'gi'), '[PASSWORD]');
    message = message.replace(/Basic\s+[A-Za-z0-9+\/=]+/gi, 'Basic [CREDENTIALS]');
    
    return message;
  }

  /**
   * Creates a connection test result
   */
  public createConnectionTestResult(
    success: boolean, 
    message: string, 
    error?: any
  ): ConnectionTestResult {
    const result: ConnectionTestResult = {
      success,
      message,
      details: {
        site_url: this.config.site_url
      }
    };

    if (error) {
      result.error = {
        code: error.code || 'UNKNOWN_ERROR',
        message: this.sanitizeErrorMessage(error),
        http_status: error.response?.status
      };
    }

    return result;
  }
}