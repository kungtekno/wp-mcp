import { WordPressAuthenticator, WordPressAPIError, createAuthenticator } from '../../src/auth.js';
import { WordPressConfig } from '../../src/types.js';
import { 
  WordPressAPIMock, 
  DEFAULT_TEST_CONFIG, 
  createTestEnvironment,
  WordPressMockData,
  WORDPRESS_ERRORS
} from '../utils/test-helpers.js';
import nock from 'nock';

describe('WordPressAuthenticator', () => {
  let authenticator: WordPressAuthenticator;
  let mockAPI: WordPressAPIMock;
  let testConfig: WordPressConfig;
  let cleanup: () => void;

  beforeEach(() => {
    const testEnv = createTestEnvironment();
    testConfig = testEnv.config.wordpress;
    cleanup = testEnv.cleanup;
    
    authenticator = new WordPressAuthenticator(testConfig);
    mockAPI = new WordPressAPIMock(testConfig.site_url);
  });

  afterEach(() => {
    cleanup();
    nock.cleanAll();
  });

  describe('constructor', () => {
    it('should create authenticator with valid config', () => {
      expect(authenticator).toBeInstanceOf(WordPressAuthenticator);
      expect(authenticator.isAuthenticatedUser()).toBe(false);
      expect(authenticator.getAuthenticatedUser()).toBeNull();
    });

    it('should create HTTP client with correct configuration', () => {
      const httpClient = authenticator.getHttpClient();
      expect(httpClient.defaults.baseURL).toBe(testConfig.site_url);
      expect(httpClient.defaults.timeout).toBe(testConfig.timeout);
      expect(httpClient.defaults.auth).toEqual({
        username: testConfig.username,
        password: testConfig.app_password
      });
    });
  });

  describe('authenticate', () => {
    it('should authenticate successfully with valid credentials', async () => {
      const mockUser = WordPressMockData.createUser({
        id: 1,
        name: 'Test User',
        email: 'test@example.com'
      });

      mockAPI.scope
        .get('/wp-json/wp/v2/users/me')
        .reply(200, mockUser);

      const result = await authenticator.authenticate();

      expect(result.success).toBe(true);
      expect(result.user).toEqual({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        roles: []
      });
      expect(result.error).toBeUndefined();
      expect(authenticator.isAuthenticatedUser()).toBe(true);
      expect(authenticator.getAuthenticatedUser()).toEqual(result.user);
    });

    it('should handle authentication failure with invalid credentials', async () => {
      mockAPI.scope
        .get('/wp-json/wp/v2/users/me')
        .reply(401, WORDPRESS_ERRORS.INVALID_CREDENTIALS);

      const result = await authenticator.authenticate();

      expect(result.success).toBe(false);
      expect(result.user).toBeUndefined();
      expect(result.error).toBe('Sorry, you are not allowed to do that.');
      expect(authenticator.isAuthenticatedUser()).toBe(false);
      expect(authenticator.getAuthenticatedUser()).toBeNull();
    });

    it('should handle 403 forbidden error', async () => {
      mockAPI.scope
        .get('/wp-json/wp/v2/users/me')
        .reply(403, { message: 'Forbidden' });

      const result = await authenticator.authenticate();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Access denied. Check user permissions.');
    });

    it('should handle 404 not found error', async () => {
      mockAPI.scope
        .get('/wp-json/wp/v2/users/me')
        .reply(404, { message: 'Not Found' });

      const result = await authenticator.authenticate();

      expect(result.success).toBe(false);
      expect(result.error).toBe('WordPress REST API not found. Ensure REST API is enabled.');
    });

    it('should handle network connection errors', async () => {
      mockAPI.scope
        .get('/wp-json/wp/v2/users/me')
        .replyWithError({ code: 'ENOTFOUND', message: 'Domain not found' });

      const result = await authenticator.authenticate();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot connect to WordPress site. Check the site URL.');
    });

    it('should handle connection refused errors', async () => {
      mockAPI.scope
        .get('/wp-json/wp/v2/users/me')
        .replyWithError({ code: 'ECONNREFUSED', message: 'Connection refused' });

      const result = await authenticator.authenticate();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection refused. WordPress site may be down.');
    });

    it('should handle timeout errors', async () => {
      mockAPI.scope
        .get('/wp-json/wp/v2/users/me')
        .delayConnection(testConfig.timeout + 1000)
        .reply(200, {});

      const result = await authenticator.authenticate();

      expect(result.success).toBe(false);
      expect(result.error).toContain('timeout');
    });

    it('should handle WordPress API errors correctly', async () => {
      const customError = {
        code: 'custom_error',
        message: 'Custom error message',
        data: { status: 422 }
      };

      mockAPI.scope
        .get('/wp-json/wp/v2/users/me')
        .reply(422, customError);

      const result = await authenticator.authenticate();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Custom error message');
    });
  });

  describe('testConnection', () => {
    it('should successfully test connection to WordPress site', async () => {
      nock(testConfig.site_url)
        .get('/wp-json/')
        .reply(200, {
          name: 'Test WordPress Site',
          description: 'Just another WordPress site',
          url: testConfig.site_url,
          namespaces: ['wp/v2', 'wp/v1']
        });

      const result = await authenticator.testConnection();

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should fail when site is not WordPress', async () => {
      nock(testConfig.site_url)
        .get('/wp-json/')
        .reply(200, { not: 'wordpress' });

      const result = await authenticator.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Site does not appear to be a WordPress site with REST API enabled.');
    });

    it('should handle domain not found errors', async () => {
      nock(testConfig.site_url)
        .get('/wp-json/')
        .replyWithError({ code: 'ENOTFOUND', message: 'Domain not found' });

      const result = await authenticator.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Domain not found. Check the site URL.');
    });

    it('should handle connection refused errors', async () => {
      nock(testConfig.site_url)
        .get('/wp-json/')
        .replyWithError({ code: 'ECONNREFUSED', message: 'Connection refused' });

      const result = await authenticator.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection refused. Site may be down or firewall blocking.');
    });

    it('should handle SSL certificate errors', async () => {
      nock(testConfig.site_url)
        .get('/wp-json/')
        .replyWithError({ code: 'CERT_VERIFICATION_ERROR', message: 'SSL verification failed' });

      const result = await authenticator.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('SSL certificate verification failed.');
    });

    it('should handle 404 errors', async () => {
      nock(testConfig.site_url)
        .get('/wp-json/')
        .reply(404, 'Not Found');

      const result = await authenticator.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('WordPress REST API endpoint not found.');
    });
  });

  describe('clearAuthentication', () => {
    it('should clear authentication state', async () => {
      // First authenticate
      mockAPI.mockAuthSuccess();
      await authenticator.authenticate();
      
      expect(authenticator.isAuthenticatedUser()).toBe(true);
      expect(authenticator.getAuthenticatedUser()).not.toBeNull();

      // Then clear
      authenticator.clearAuthentication();

      expect(authenticator.isAuthenticatedUser()).toBe(false);
      expect(authenticator.getAuthenticatedUser()).toBeNull();
    });
  });

  describe('updateConfig', () => {
    it('should update configuration and clear authentication', async () => {
      // First authenticate
      mockAPI.mockAuthSuccess();
      await authenticator.authenticate();
      
      expect(authenticator.isAuthenticatedUser()).toBe(true);

      // Update config
      const newConfig: WordPressConfig = {
        ...testConfig,
        site_url: 'https://new-site.com',
        username: 'newuser'
      };

      authenticator.updateConfig(newConfig);

      // Should clear authentication
      expect(authenticator.isAuthenticatedUser()).toBe(false);
      expect(authenticator.getAuthenticatedUser()).toBeNull();

      // HTTP client should have new config
      const httpClient = authenticator.getHttpClient();
      expect(httpClient.defaults.baseURL).toBe(newConfig.site_url);
      expect(httpClient.defaults.auth?.username).toBe(newConfig.username);
    });
  });

  describe('getHttpClient', () => {
    it('should return configured axios instance', () => {
      const httpClient = authenticator.getHttpClient();
      
      expect(httpClient.defaults.baseURL).toBe(testConfig.site_url);
      expect(httpClient.defaults.timeout).toBe(testConfig.timeout);
      expect(httpClient.defaults.headers['Content-Type']).toBe('application/json');
      expect(httpClient.defaults.headers['User-Agent']).toBe('MCP-WordPress-Server/1.0.0');
    });

    it('should have request interceptor for test environment logging', () => {
      const httpClient = authenticator.getHttpClient();
      expect(httpClient.interceptors.request.handlers).toHaveLength(1);
    });

    it('should have response interceptor for error handling', () => {
      const httpClient = authenticator.getHttpClient();
      expect(httpClient.interceptors.response.handlers).toHaveLength(1);
    });
  });
});

describe('WordPressAPIError', () => {
  it('should create error with WordPress error data', () => {
    const wpError = WORDPRESS_ERRORS.INVALID_POST_ID;
    const error = new WordPressAPIError(wpError, 404);

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(WordPressAPIError);
    expect(error.name).toBe('WordPressAPIError');
    expect(error.message).toBe(wpError.message);
    expect(error.code).toBe(wpError.code);
    expect(error.status).toBe(404);
    expect(error.data).toBe(wpError.data);
  });

  it('should use status from WordPress error data if not provided', () => {
    const wpError = WORDPRESS_ERRORS.INVALID_POST_ID;
    const error = new WordPressAPIError(wpError);

    expect(error.status).toBe(wpError.data.status);
  });
});

describe('createAuthenticator', () => {
  it('should create authenticator instance', () => {
    const config: WordPressConfig = {
      site_url: 'https://example.com',
      username: 'testuser',
      app_password: 'test password',
      verify_ssl: true,
      timeout: 30000
    };

    const authenticator = createAuthenticator(config);

    expect(authenticator).toBeInstanceOf(WordPressAuthenticator);
    expect(authenticator.isAuthenticatedUser()).toBe(false);
  });
});

describe('Integration with HTTP client interceptors', () => {
  let authenticator: WordPressAuthenticator;
  let mockAPI: WordPressAPIMock;

  beforeEach(() => {
    const testEnv = createTestEnvironment();
    authenticator = new WordPressAuthenticator(testEnv.config.wordpress);
    mockAPI = new WordPressAPIMock();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  it('should transform WordPress API errors to WordPressAPIError', async () => {
    const wpError = WORDPRESS_ERRORS.INVALID_POST_ID;
    
    mockAPI.scope
      .get('/wp-json/wp/v2/posts/999')
      .reply(404, wpError);

    const httpClient = authenticator.getHttpClient();

    await expect(httpClient.get('/wp-json/wp/v2/posts/999'))
      .rejects.toThrow(WordPressAPIError);

    try {
      await httpClient.get('/wp-json/wp/v2/posts/999');
    } catch (error) {
      expect(error).toBeInstanceOf(WordPressAPIError);
      expect((error as WordPressAPIError).code).toBe(wpError.code);
      expect((error as WordPressAPIError).message).toBe(wpError.message);
      expect((error as WordPressAPIError).status).toBe(404);
    }
  });

  it('should pass through non-WordPress errors', async () => {
    mockAPI.scope
      .get('/wp-json/wp/v2/posts/999')
      .reply(500, 'Internal Server Error');

    const httpClient = authenticator.getHttpClient();

    await expect(httpClient.get('/wp-json/wp/v2/posts/999'))
      .rejects.not.toThrow(WordPressAPIError);
  });
});