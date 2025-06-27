import { 
  ConnectionTestResult, 
  WordPressAuthError, 
  AuthErrorType,
  WordPressUser 
} from '../types.js';
import { WordPressAuthenticationManager } from './authentication-manager.js';
import { WordPressHttpClient } from './http-client.js';

/**
 * WordPress Connection Tester
 * Provides comprehensive connection testing and validation
 */
export class WordPressConnectionTester {
  private authManager: WordPressAuthenticationManager;
  private httpClient: WordPressHttpClient;

  constructor(authManager: WordPressAuthenticationManager) {
    this.authManager = authManager;
    this.httpClient = new WordPressHttpClient(authManager);
  }

  /**
   * Performs a comprehensive connection test
   */
  public async testConnection(): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    try {
      // Step 1: Validate configuration
      const securityValidation = this.authManager.validateSecurity();
      if (!securityValidation.isSecure) {
        return this.authManager.createConnectionTestResult(
          false,
          `Security validation failed: ${securityValidation.issues.join(', ')}`
        );
      }

      // Step 2: Test authentication setup
      await this.authManager.authenticate();

      // Step 3: Test basic connectivity
      const connectivityResult = await this.testBasicConnectivity();
      if (!connectivityResult.success) {
        return connectivityResult;
      }

      // Step 4: Test API access
      const apiResult = await this.testApiAccess();
      if (!apiResult.success) {
        return apiResult;
      }

      // Step 5: Get detailed site information
      const siteInfo = await this.getSiteInformation();
      
      const duration = Date.now() - startTime;
      
      return {
        success: true,
        message: `Successfully connected to WordPress site in ${duration}ms`,
        details: {
          site_url: this.authManager.getSiteUrl(),
          wordpress_version: siteInfo.wordpress_version,
          user_info: siteInfo.user_info,
          api_endpoints: siteInfo.api_endpoints,
          security_warnings: securityValidation.warnings
        }
      };

    } catch (error) {
      return this.handleConnectionError(error);
    }
  }

  /**
   * Tests basic connectivity to the WordPress site
   */
  private async testBasicConnectivity(): Promise<ConnectionTestResult> {
    try {
      // Test if the site is reachable
      const response = await this.httpClient.get('/');
      
      if (response.status !== 200) {
        return this.authManager.createConnectionTestResult(
          false,
          'WordPress site is not responding correctly',
          { code: 'SITE_UNREACHABLE', response }
        );
      }

      return this.authManager.createConnectionTestResult(
        true,
        'Basic connectivity test passed'
      );

    } catch (error) {
      return this.authManager.createConnectionTestResult(
        false,
        'Failed to connect to WordPress site',
        error
      );
    }
  }

  /**
   * Tests WordPress REST API access
   */
  private async testApiAccess(): Promise<ConnectionTestResult> {
    try {
      // Test authentication with a simple API call
      const response = await this.httpClient.get('/users/me');
      
      if (response.status !== 200) {
        return this.authManager.createConnectionTestResult(
          false,
          'WordPress REST API authentication failed',
          { code: 'API_AUTH_FAILED', response }
        );
      }

      // Verify the user has appropriate permissions
      const user = response.data as WordPressUser;
      if (!user.capabilities || Object.keys(user.capabilities).length === 0) {
        return this.authManager.createConnectionTestResult(
          false,
          'User has insufficient permissions for API access'
        );
      }

      return this.authManager.createConnectionTestResult(
        true,
        'WordPress REST API access test passed'
      );

    } catch (error) {
      return this.authManager.createConnectionTestResult(
        false,
        'WordPress REST API access failed',
        error
      );
    }
  }

  /**
   * Gets comprehensive site information
   */
  private async getSiteInformation(): Promise<{
    wordpress_version?: string;
    user_info: Partial<WordPressUser>;
    api_endpoints: string[];
    security_warnings?: string[];
  }> {
    try {
      const connectionInfo = await this.httpClient.getConnectionInfo();
      
      return {
        wordpress_version: connectionInfo.site.wordpress_version,
        user_info: {
          id: connectionInfo.user.id,
          username: connectionInfo.user.username,
          name: connectionInfo.user.name,
          roles: connectionInfo.user.roles,
          capabilities: connectionInfo.user.capabilities
        },
        api_endpoints: connectionInfo.api_endpoints.slice(0, 10) // Limit to first 10 for brevity
      };

    } catch (error) {
      // Return partial information if available
      return {
        user_info: {},
        api_endpoints: []
      };
    }
  }

  /**
   * Tests specific WordPress functionality
   */
  public async testFunctionality(functionality: 'posts' | 'media' | 'categories' | 'users'): Promise<ConnectionTestResult> {
    try {
      switch (functionality) {
        case 'posts':
          return this.testPostsAccess();
        case 'media':
          return this.testMediaAccess();
        case 'categories':
          return this.testCategoriesAccess();
        case 'users':
          return this.testUsersAccess();
        default:
          return this.authManager.createConnectionTestResult(
            false,
            `Unknown functionality: ${functionality}`
          );
      }
    } catch (error) {
      return this.handleConnectionError(error);
    }
  }

  /**
   * Tests posts functionality
   */
  private async testPostsAccess(): Promise<ConnectionTestResult> {
    try {
      // Try to fetch posts (read permission)
      const response = await this.httpClient.get('/posts', {
        params: { per_page: 1 }
      });

      const canRead = response.status === 200;
      let message = 'Posts read access: ' + (canRead ? 'OK' : 'FAILED');

      // Try to check if user can create posts (this requires edit_posts capability)
      try {
        const userResponse = await this.httpClient.get('/users/me');
        const user = userResponse.data as WordPressUser;
        const canEdit = user.capabilities?.edit_posts || false;
        message += `, Posts write access: ${canEdit ? 'OK' : 'LIMITED'}`;
      } catch {
        message += ', Posts write access: UNKNOWN';
      }

      return this.authManager.createConnectionTestResult(
        canRead,
        message
      );

    } catch (error) {
      return this.authManager.createConnectionTestResult(
        false,
        'Posts functionality test failed',
        error
      );
    }
  }

  /**
   * Tests media functionality
   */
  private async testMediaAccess(): Promise<ConnectionTestResult> {
    try {
      const response = await this.httpClient.get('/media', {
        params: { per_page: 1 }
      });

      const canRead = response.status === 200;
      let message = 'Media read access: ' + (canRead ? 'OK' : 'FAILED');

      // Check upload permissions
      try {
        const userResponse = await this.httpClient.get('/users/me');
        const user = userResponse.data as WordPressUser;
        const canUpload = user.capabilities?.upload_files || false;
        message += `, Media upload access: ${canUpload ? 'OK' : 'LIMITED'}`;
      } catch {
        message += ', Media upload access: UNKNOWN';
      }

      return this.authManager.createConnectionTestResult(
        canRead,
        message
      );

    } catch (error) {
      return this.authManager.createConnectionTestResult(
        false,
        'Media functionality test failed',
        error
      );
    }
  }

  /**
   * Tests categories functionality
   */
  private async testCategoriesAccess(): Promise<ConnectionTestResult> {
    try {
      const response = await this.httpClient.get('/categories', {
        params: { per_page: 1 }
      });

      return this.authManager.createConnectionTestResult(
        response.status === 200,
        'Categories access: ' + (response.status === 200 ? 'OK' : 'FAILED')
      );

    } catch (error) {
      return this.authManager.createConnectionTestResult(
        false,
        'Categories functionality test failed',
        error
      );
    }
  }

  /**
   * Tests users functionality
   */
  private async testUsersAccess(): Promise<ConnectionTestResult> {
    try {
      // Most WordPress sites restrict user listing, so we test with the current user
      const response = await this.httpClient.get('/users/me');

      return this.authManager.createConnectionTestResult(
        response.status === 200,
        'Users access: ' + (response.status === 200 ? 'OK' : 'FAILED')
      );

    } catch (error) {
      return this.authManager.createConnectionTestResult(
        false,
        'Users functionality test failed',
        error
      );
    }
  }

  /**
   * Performs a quick connection test (minimal checks)
   */
  public async quickTest(): Promise<ConnectionTestResult> {
    try {
      await this.authManager.authenticate();
      const canConnect = await this.httpClient.testConnection();
      
      return this.authManager.createConnectionTestResult(
        canConnect,
        canConnect ? 'Quick connection test passed' : 'Quick connection test failed'
      );

    } catch (error) {
      return this.handleConnectionError(error);
    }
  }

  /**
   * Handles connection errors and creates appropriate error responses
   */
  private handleConnectionError(error: any): ConnectionTestResult {
    if (error instanceof WordPressAuthError) {
      return this.authManager.createConnectionTestResult(
        false,
        error.message,
        error
      );
    }

    return this.authManager.createConnectionTestResult(
      false,
      'Unexpected error during connection test',
      error
    );
  }

  /**
   * Gets a detailed connection report
   */
  public async getConnectionReport(): Promise<{
    basic_connectivity: ConnectionTestResult;
    api_access: ConnectionTestResult;
    functionality_tests: Record<string, ConnectionTestResult>;
    security_check: {
      isSecure: boolean;
      issues: string[];
      warnings: string[];
    };
  }> {
    const report = {
      basic_connectivity: await this.testBasicConnectivity(),
      api_access: await this.testApiAccess(),
      functionality_tests: {} as Record<string, ConnectionTestResult>,
      security_check: this.authManager.validateSecurity()
    };

    // Test individual functionalities
    const functionalities = ['posts', 'media', 'categories', 'users'] as const;
    for (const func of functionalities) {
      report.functionality_tests[func] = await this.testFunctionality(func);
    }

    return report;
  }
}