import { 
  WordPressConfig, 
  ConnectionTestResult, 
  WordPressAuthError, 
  AuthErrorType,
  SecurityValidationResult
} from '../types.js';
import { WordPressConfigLoader } from './config-loader.js';
import { WordPressAuthenticationManager } from './authentication-manager.js';
import { WordPressHttpClient } from './http-client.js';
import { WordPressConnectionTester } from './connection-tester.js';
import { WordPressErrorHandler, ErrorContext } from '../utils/error-handler.js';

/**
 * Main WordPress Authentication Service
 * Orchestrates all authentication, security, and connection functionality
 */
export class WordPressAuthService {
  private configLoader: WordPressConfigLoader;
  private authManager: WordPressAuthenticationManager | null = null;
  private httpClient: WordPressHttpClient | null = null;
  private connectionTester: WordPressConnectionTester | null = null;
  private isInitialized = false;

  constructor() {
    this.configLoader = new WordPressConfigLoader();
  }

  /**
   * Initializes the authentication service
   */
  public async initialize(): Promise<void> {
    try {
      // Load configuration
      const config = await this.configLoader.loadConfig();
      
      // Initialize authentication manager
      this.authManager = new WordPressAuthenticationManager(config);
      
      // Validate security
      const securityValidation = this.authManager.validateSecurity();
      if (!securityValidation.isSecure) {
        throw new WordPressAuthError(
          AuthErrorType.INVALID_CREDENTIALS,
          `Security validation failed: ${securityValidation.issues.join(', ')}`
        );
      }
      
      // Set up authentication
      await this.authManager.authenticate();
      
      // Initialize HTTP client
      this.httpClient = new WordPressHttpClient(this.authManager);
      
      // Initialize connection tester
      this.connectionTester = new WordPressConnectionTester(this.authManager);
      
      this.isInitialized = true;
      
    } catch (error) {
      this.handleInitializationError(error);
    }
  }

  /**
   * Tests the WordPress connection
   */
  public async testConnection(): Promise<ConnectionTestResult> {
    this.ensureInitialized();
    
    try {
      return await this.connectionTester!.testConnection();
    } catch (error) {
      return this.handleConnectionError(error, 'testConnection');
    }
  }

  /**
   * Performs a quick connection test
   */
  public async quickTest(): Promise<ConnectionTestResult> {
    this.ensureInitialized();
    
    try {
      return await this.connectionTester!.quickTest();
    } catch (error) {
      return this.handleConnectionError(error, 'quickTest');
    }
  }

  /**
   * Tests specific WordPress functionality
   */
  public async testFunctionality(functionality: 'posts' | 'media' | 'categories' | 'users'): Promise<ConnectionTestResult> {
    this.ensureInitialized();
    
    try {
      return await this.connectionTester!.testFunctionality(functionality);
    } catch (error) {
      return this.handleConnectionError(error, `testFunctionality:${functionality}`);
    }
  }

  /**
   * Gets a comprehensive connection report
   */
  public async getConnectionReport(): Promise<any> {
    this.ensureInitialized();
    
    try {
      return await this.connectionTester!.getConnectionReport();
    } catch (error) {
      throw this.createManagedError(error, 'getConnectionReport');
    }
  }

  /**
   * Gets the HTTP client for making WordPress API requests
   */
  public getHttpClient(): WordPressHttpClient {
    this.ensureInitialized();
    return this.httpClient!;
  }

  /**
   * Gets the authentication manager
   */
  public getAuthManager(): WordPressAuthenticationManager {
    this.ensureInitialized();
    return this.authManager!;
  }

  /**
   * Gets the current configuration (sanitized)
   */
  public getConfig(): Omit<WordPressConfig, 'app_password'> {
    this.ensureInitialized();
    return this.authManager!.getConfig();
  }

  /**
   * Gets the configuration source information
   */
  public getConfigInfo(): {
    source: string | null;
    config: Omit<WordPressConfig, 'app_password'> | null;
  } {
    return {
      source: this.configLoader.getConfigSource(),
      config: this.configLoader.getLoadedConfig()
    };
  }

  /**
   * Updates the configuration and reinitializes
   */
  public async updateConfig(newConfig: WordPressConfig): Promise<void> {
    try {
      // Update authentication manager
      if (this.authManager) {
        await this.authManager.updateConfig(newConfig);
      } else {
        this.authManager = new WordPressAuthenticationManager(newConfig);
        await this.authManager.authenticate();
      }

      // Update HTTP client
      if (this.httpClient) {
        this.httpClient.updateAuthManager(this.authManager);
      } else {
        this.httpClient = new WordPressHttpClient(this.authManager);
      }

      // Update connection tester
      this.connectionTester = new WordPressConnectionTester(this.authManager);

      this.isInitialized = true;

    } catch (error) {
      throw this.createManagedError(error, 'updateConfig');
    }
  }

  /**
   * Validates the current authentication
   */
  public isAuthenticated(): boolean {
    if (!this.isInitialized || !this.authManager) {
      return false;
    }
    
    return this.authManager.isAuthenticated();
  }

  /**
   * Invalidates the current authentication
   */
  public invalidateAuth(): void {
    if (this.authManager) {
      this.authManager.invalidateAuth();
    }
  }

  /**
   * Re-authenticates with the current configuration
   */
  public async reAuthenticate(): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.authManager!.authenticate();
    } catch (error) {
      throw this.createManagedError(error, 'reAuthenticate');
    }
  }

  /**
   * Gets security validation for the current configuration
   */
  public getSecurityValidation(): SecurityValidationResult {
    this.ensureInitialized();
    return this.authManager!.validateSecurity();
  }

  /**
   * Creates a troubleshooting guide for connection issues
   */
  public createTroubleshootingGuide(testResult: ConnectionTestResult): string {
    return WordPressErrorHandler.createTroubleshootingGuide(testResult);
  }

  /**
   * Gets setup instructions for configuration
   */
  public static getSetupInstructions(): {
    environmentVariables: string;
    sampleConfig: string;
  } {
    return {
      environmentVariables: WordPressConfigLoader.getEnvironmentSetupInstructions(),
      sampleConfig: WordPressConfigLoader.createSampleConfig()
    };
  }

  /**
   * Validates the current setup
   */
  public static async validateSetup(): Promise<{
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    return WordPressConfigLoader.validateSetup();
  }

  // Private helper methods

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new WordPressAuthError(
        AuthErrorType.UNKNOWN_ERROR,
        'WordPress authentication service is not initialized. Call initialize() first.'
      );
    }
  }

  private handleInitializationError(error: any): never {
    if (error instanceof WordPressAuthError) {
      throw error;
    }

    throw new WordPressAuthError(
      AuthErrorType.UNKNOWN_ERROR,
      `Failed to initialize WordPress authentication service: ${error instanceof Error ? error.message : 'Unknown error'}`,
      undefined,
      error instanceof Error ? error : undefined
    );
  }

  private handleConnectionError(error: any, operation: string): ConnectionTestResult {
    if (error instanceof WordPressAuthError) {
      return {
        success: false,
        message: error.message,
        error: {
          code: error.type,
          message: error.message,
          http_status: error.httpStatus
        }
      };
    }

    return {
      success: false,
      message: `Connection test failed during ${operation}`,
      error: {
        code: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }

  private createManagedError(error: any, operation: string): WordPressAuthError {
    if (error instanceof WordPressAuthError) {
      return error;
    }

    const context: ErrorContext = {
      operation,
      timestamp: new Date()
    };

    WordPressErrorHandler.logError(
      error instanceof WordPressAuthError ? error : new WordPressAuthError(
        AuthErrorType.UNKNOWN_ERROR,
        error instanceof Error ? error.message : 'Unknown error'
      ),
      context
    );

    return new WordPressAuthError(
      AuthErrorType.UNKNOWN_ERROR,
      `Operation '${operation}' failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      undefined,
      error instanceof Error ? error : undefined
    );
  }

  /**
   * Creates an MCP-compatible error response
   */
  public createMCPErrorResponse(error: WordPressAuthError, operation?: string): {
    isError: true;
    content: Array<{ type: 'text'; text: string }>;
  } {
    const context: ErrorContext | undefined = operation ? {
      operation,
      timestamp: new Date()
    } : undefined;

    return WordPressErrorHandler.createMCPErrorResponse(error, context);
  }

  /**
   * Disposes of the service and cleans up resources
   */
  public dispose(): void {
    this.invalidateAuth();
    this.isInitialized = false;
    this.authManager = null;
    this.httpClient = null;
    this.connectionTester = null;
  }
}