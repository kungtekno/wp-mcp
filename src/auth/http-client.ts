import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { Agent as HttpsAgent } from 'https';
import { 
  WordPressAuthError, 
  AuthErrorType, 
  HttpClientConfig,
  RateLimitConfig 
} from '../types.js';
import { WordPressAuthenticationManager } from './authentication-manager.js';

/**
 * Rate limiter implementation
 */
class RateLimiter {
  private requests: number[] = [];
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  async checkLimit(): Promise<void> {
    const now = Date.now();
    const windowStart = now - this.config.window_ms;
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => time > windowStart);
    
    // Check if we're over the limit
    if (this.requests.length >= this.config.requests_per_minute) {
      const oldestRequest = this.requests[0];
      const waitTime = this.config.window_ms - (now - oldestRequest);
      
      throw new WordPressAuthError(
        AuthErrorType.RATE_LIMITED,
        `Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`
      );
    }
    
    // Add current request
    this.requests.push(now);
  }
}

/**
 * WordPress HTTP Client with built-in authentication and security features
 */
export class WordPressHttpClient {
  private axiosInstance: AxiosInstance;
  private authManager: WordPressAuthenticationManager;
  private rateLimiter?: RateLimiter;
  private retryCount = 0;
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000; // 1 second

  constructor(authManager: WordPressAuthenticationManager) {
    this.authManager = authManager;
    
    // Initialize rate limiter if configured
    const config = authManager.getConfig();
    if (config.rate_limit) {
      this.rateLimiter = new RateLimiter({
        ...config.rate_limit,
        window_ms: 60000 // 1 minute window
      });
    }

    this.axiosInstance = this.createAxiosInstance();
    this.setupInterceptors();
  }

  /**
   * Creates the Axios instance with secure configuration
   */
  private createAxiosInstance(): AxiosInstance {
    const config = this.authManager.getConfig();
    
    const httpClientConfig: HttpClientConfig = {
      baseURL: this.authManager.getApiBaseUrl(),
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'MCP-WordPress-Server/1.0.0'
      }
    };

    // Configure HTTPS agent for SSL settings
    if (config.verify_ssl !== false) {
      httpClientConfig.httpsAgent = new HttpsAgent({
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2' // Enforce minimum TLS version
      });
    } else {
      // Only allow SSL verification disabled for development
      httpClientConfig.httpsAgent = new HttpsAgent({
        rejectUnauthorized: false
      });
    }

    return axios.create(httpClientConfig);
  }

  /**
   * Sets up request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor for authentication and rate limiting
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        // Check rate limiting
        if (this.rateLimiter) {
          await this.rateLimiter.checkLimit();
        }

        // Ensure authentication is valid
        if (!this.authManager.isAuthenticated()) {
          await this.authManager.authenticate();
        }

        // Add authentication header
        config.headers = config.headers || {};
        config.headers.Authorization = this.authManager.getAuthorizationHeader();

        return config;
      },
      (error) => {
        return this.handleRequestError(error);
      }
    );

    // Response interceptor for error handling and retry logic
    this.axiosInstance.interceptors.response.use(
      (response) => {
        this.retryCount = 0; // Reset retry count on success
        return response;
      },
      async (error) => {
        return this.handleResponseError(error);
      }
    );
  }

  /**
   * Handles request errors
   */
  private async handleRequestError(error: any): Promise<never> {
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      throw new WordPressAuthError(
        AuthErrorType.NETWORK_ERROR,
        `Cannot connect to WordPress site: ${this.authManager.getSiteUrl()}`,
        undefined,
        error
      );
    }

    if (error.code === 'ETIMEDOUT') {
      throw new WordPressAuthError(
        AuthErrorType.TIMEOUT,
        'Request timed out while connecting to WordPress',
        undefined,
        error
      );
    }

    throw new WordPressAuthError(
      AuthErrorType.UNKNOWN_ERROR,
      this.authManager.sanitizeErrorMessage(error),
      undefined,
      error
    );
  }

  /**
   * Handles response errors with retry logic
   */
  private async handleResponseError(error: AxiosError): Promise<never> {
    const status = error.response?.status;
    const data = error.response?.data as any;

    // Handle authentication errors
    if (status === 401) {
      this.authManager.invalidateAuth();
      
      // Retry authentication once
      if (this.retryCount < 1) {
        this.retryCount++;
        try {
          await this.authManager.authenticate();
          return this.axiosInstance.request(error.config!);
        } catch (authError) {
          throw new WordPressAuthError(
            AuthErrorType.INVALID_CREDENTIALS,
            'Authentication failed. Please check your username and application password.',
            401,
            authError instanceof Error ? authError : error
          );
        }
      }

      throw new WordPressAuthError(
        AuthErrorType.UNAUTHORIZED,
        'Invalid credentials or expired authentication',
        401,
        error
      );
    }

    if (status === 403) {
      throw new WordPressAuthError(
        AuthErrorType.FORBIDDEN,
        data?.message || 'Access forbidden. Check user permissions.',
        403,
        error
      );
    }

    if (status === 429) {
      throw new WordPressAuthError(
        AuthErrorType.RATE_LIMITED,
        'Rate limit exceeded by WordPress server',
        429,
        error
      );
    }

    // Handle network timeouts
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      throw new WordPressAuthError(
        AuthErrorType.TIMEOUT,
        'Request timed out',
        undefined,
        error
      );
    }

    // Handle SSL errors
    if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
      throw new WordPressAuthError(
        AuthErrorType.SSL_ERROR,
        'SSL certificate error. Check your WordPress site\'s SSL configuration.',
        undefined,
        error
      );
    }

    // Generic server errors
    if (status && status >= 500) {
      throw new WordPressAuthError(
        AuthErrorType.NETWORK_ERROR,
        `WordPress server error (${status}): ${data?.message || 'Internal server error'}`,
        status,
        error
      );
    }

    // Client errors
    if (status && status >= 400) {
      throw new WordPressAuthError(
        AuthErrorType.UNKNOWN_ERROR,
        `WordPress API error (${status}): ${data?.message || 'Bad request'}`,
        status,
        error
      );
    }

    throw new WordPressAuthError(
      AuthErrorType.UNKNOWN_ERROR,
      this.authManager.sanitizeErrorMessage(error),
      status,
      error
    );
  }

  /**
   * Makes a GET request
   */
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.get(url, config);
  }

  /**
   * Makes a POST request
   */
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.post(url, data, config);
  }

  /**
   * Makes a PUT request
   */
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.put(url, data, config);
  }

  /**
   * Makes a DELETE request
   */
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.delete(url, config);
  }

  /**
   * Makes a PATCH request
   */
  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return this.axiosInstance.patch(url, data, config);
  }

  /**
   * Tests the connection to WordPress
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to fetch site info and user info
      const [siteResponse, userResponse] = await Promise.all([
        this.get('/settings'),
        this.get('/users/me')
      ]);

      return siteResponse.status === 200 && userResponse.status === 200;
    } catch (error) {
      if (error instanceof WordPressAuthError) {
        throw error;
      }
      
      throw new WordPressAuthError(
        AuthErrorType.NETWORK_ERROR,
        'Connection test failed',
        undefined,
        error instanceof Error ? error : new Error('Unknown error')
      );
    }
  }

  /**
   * Gets detailed connection information
   */
  async getConnectionInfo(): Promise<{
    site: any;
    user: any;
    api_endpoints: string[];
  }> {
    try {
      const [siteResponse, userResponse] = await Promise.all([
        this.get('/settings'),
        this.get('/users/me')
      ]);

      // Get available API endpoints
      const rootResponse = await axios.get(this.authManager.getSiteUrl() + '/wp-json/wp/v2/');
      const apiEndpoints = Object.keys(rootResponse.data.routes || {});

      return {
        site: siteResponse.data,
        user: userResponse.data,
        api_endpoints: apiEndpoints
      };
    } catch (error) {
      if (error instanceof WordPressAuthError) {
        throw error;
      }
      
      throw new WordPressAuthError(
        AuthErrorType.NETWORK_ERROR,
        'Failed to get connection information',
        undefined,
        error instanceof Error ? error : new Error('Unknown error')
      );
    }
  }

  /**
   * Updates the authentication manager and recreates the client
   */
  updateAuthManager(authManager: WordPressAuthenticationManager): void {
    this.authManager = authManager;
    this.axiosInstance = this.createAxiosInstance();
    this.setupInterceptors();
  }
}