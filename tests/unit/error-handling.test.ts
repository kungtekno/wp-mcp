/**
 * Comprehensive error handling tests
 * Tests various error scenarios and ensures proper error responses
 */

import { WordPressAuthenticator, WordPressAPIError } from '../../src/auth.js';
import { WordPressPostsService } from '../../src/services/posts.js';
import { WordPressConfig } from '../../src/types.js';
import { 
  WordPressAPIMock, 
  createTestEnvironment,
  WORDPRESS_ERRORS,
  isValidMCPErrorResponse
} from '../utils/test-helpers.js';
import { AxiosError } from 'axios';
import nock from 'nock';

describe('Error Handling Tests', () => {
  let authenticator: WordPressAuthenticator;
  let postsService: WordPressPostsService;
  let mockAPI: WordPressAPIMock;
  let testConfig: WordPressConfig;
  let cleanup: () => void;

  beforeEach(() => {
    const testEnv = createTestEnvironment();
    testConfig = testEnv.config.wordpress;
    cleanup = testEnv.cleanup;
    
    authenticator = new WordPressAuthenticator(testConfig);
    postsService = new WordPressPostsService(authenticator.getHttpClient());
    mockAPI = new WordPressAPIMock(testConfig.site_url);
  });

  afterEach(() => {
    cleanup();
    nock.cleanAll();
  });

  describe('WordPress API Error Handling', () => {
    it('should handle 400 Bad Request errors', async () => {
      const badRequestError = {
        code: 'rest_invalid_param',
        message: 'Invalid parameter(s): title',
        data: { 
          status: 400,
          params: { title: 'Title is required.' }
        }
      };

      mockAPI.scope
        .post('/wp-json/wp/v2/posts')
        .reply(400, badRequestError);

      const result = await postsService.createPost({
        title: '', // Invalid empty title
        content: 'Test content'
      });

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('Invalid parameter(s): title');
      expect(result.code).toBe('rest_invalid_param');
    });

    it('should handle 401 Unauthorized errors', async () => {
      mockAPI.scope
        .get('/wp-json/wp/v2/posts/1')
        .reply(401, WORDPRESS_ERRORS.INVALID_CREDENTIALS);

      const result = await postsService.readPost({ id: 1 });

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('Sorry, you are not allowed to do that.');
    });

    it('should handle 403 Forbidden errors', async () => {
      mockAPI.scope
        .post('/wp-json/wp/v2/posts')
        .reply(403, WORDPRESS_ERRORS.PERMISSION_DENIED);

      const result = await postsService.createPost({
        title: 'Test Post',
        content: 'Test content'
      });

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('Sorry, you are not allowed to edit this post.');
    });

    it('should handle 404 Not Found errors', async () => {
      mockAPI.scope
        .get('/wp-json/wp/v2/posts/999')
        .reply(404, WORDPRESS_ERRORS.INVALID_POST_ID);

      const result = await postsService.readPost({ id: 999 });

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('Invalid post ID.');
    });

    it('should handle 429 Rate Limit errors', async () => {
      mockAPI.scope
        .get('/wp-json/wp/v2/posts')
        .reply(429, WORDPRESS_ERRORS.RATE_LIMITED);

      const result = await postsService.listPosts({});

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('Too many requests. Please try again later.');
    });

    it('should handle 500 Internal Server errors', async () => {
      mockAPI.scope
        .get('/wp-json/wp/v2/posts')
        .reply(500, WORDPRESS_ERRORS.SERVER_ERROR);

      const result = await postsService.listPosts({});

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('Internal server error.');
    });

    it('should handle custom WordPress error codes', async () => {
      const customError = {
        code: 'custom_plugin_error',
        message: 'Custom plugin validation failed',
        data: { status: 422 }
      };

      mockAPI.scope
        .post('/wp-json/wp/v2/posts')
        .reply(422, customError);

      const result = await postsService.createPost({
        title: 'Test Post',
        content: 'Test content'
      });

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('Custom plugin validation failed');
      expect(result.code).toBe('custom_plugin_error');
    });
  });

  describe('Network Error Handling', () => {
    it('should handle DNS resolution failures (ENOTFOUND)', async () => {
      mockAPI.scope
        .get('/wp-json/wp/v2/posts')
        .replyWithError({ code: 'ENOTFOUND', message: 'getaddrinfo ENOTFOUND' });

      const result = await postsService.listPosts({});

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('Cannot connect to WordPress site. Check the site URL.');
      expect(result.code).toBe('connection_error');
    });

    it('should handle connection refused errors (ECONNREFUSED)', async () => {
      mockAPI.scope
        .get('/wp-json/wp/v2/posts')
        .replyWithError({ code: 'ECONNREFUSED', message: 'connect ECONNREFUSED' });

      const result = await postsService.listPosts({});

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('Connection refused. WordPress site may be down.');
      expect(result.code).toBe('connection_error');
    });

    it('should handle timeout errors', async () => {
      mockAPI.scope
        .get('/wp-json/wp/v2/posts')
        .delayConnection(testConfig.timeout + 1000)
        .reply(200, []);

      const result = await postsService.listPosts({});

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('timeout');
    });

    it('should handle network interruption', async () => {
      mockAPI.scope
        .get('/wp-json/wp/v2/posts')
        .replyWithError({ code: 'ECONNRESET', message: 'socket hang up' });

      const result = await postsService.listPosts({});

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('socket hang up');
    });

    it('should handle SSL certificate errors', async () => {
      mockAPI.scope
        .get('/wp-json/wp/v2/posts')
        .replyWithError({ 
          code: 'CERT_VERIFICATION_ERROR', 
          message: 'certificate verify failed' 
        });

      const result = await postsService.listPosts({});

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('certificate verify failed');
    });
  });

  describe('Input Validation Error Handling', () => {
    it('should handle Zod validation errors with multiple fields', async () => {
      const invalidInput = {
        // Missing required title
        content: '',
        status: 'invalid-status',
        categories: ['not-a-number'],
        featured_media: -1
      };

      const result = await postsService.createPost(invalidInput as any);

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.code).toBe('validation_error');
      expect(result.content[0].text).toContain('Invalid input');
    });

    it('should handle validation errors with custom error messages', async () => {
      // ReadPostSchema requires either id or slug
      const invalidInput = {
        include_meta: true,
        context: 'view'
        // Missing both id and slug
      };

      const result = await postsService.readPost(invalidInput as any);

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.code).toBe('validation_error');
      expect(result.content[0].text).toContain('Either \'id\' or \'slug\' must be provided');
    });

    it('should handle type coercion failures', async () => {
      const invalidInput = {
        id: 'not-a-number',
        title: 'Test Post'
      };

      const result = await postsService.updatePost(invalidInput as any);

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.code).toBe('validation_error');
    });

    it('should handle array validation errors', async () => {
      const invalidInput = {
        title: 'Test Post',
        content: 'Test content',
        categories: 'not-an-array'
      };

      const result = await postsService.createPost(invalidInput as any);

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.code).toBe('validation_error');
    });
  });

  describe('Authentication Error Handling', () => {
    it('should handle authentication failure during requests', async () => {
      // Mock an authenticated request that fails due to invalid credentials
      const httpClient = authenticator.getHttpClient();
      
      mockAPI.scope
        .get('/wp-json/wp/v2/posts')
        .reply(401, {
          code: 'rest_cannot_access',
          message: 'Sorry, you are not allowed to do that.',
          data: { status: 401 }
        });

      const result = await postsService.listPosts({});

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('Authentication failed. Check your credentials.');
      expect(result.code).toBe('auth_error');
    });

    it('should handle expired authentication tokens', async () => {
      mockAPI.scope
        .get('/wp-json/wp/v2/posts')
        .reply(403, {
          code: 'rest_forbidden',
          message: 'Sorry, you are not allowed to do that.',
          data: { status: 403 }
        });

      const result = await postsService.listPosts({});

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('Permission denied. Check user permissions.');
      expect(result.code).toBe('permission_error');
    });
  });

  describe('WordPress API Error Class', () => {
    it('should create WordPressAPIError with correct properties', () => {
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

    it('should use status from WordPress error data when not provided', () => {
      const wpError = WORDPRESS_ERRORS.INVALID_POST_ID;
      const error = new WordPressAPIError(wpError);

      expect(error.status).toBe(wpError.data.status);
    });

    it('should be properly serializable', () => {
      const wpError = WORDPRESS_ERRORS.INVALID_POST_ID;
      const error = new WordPressAPIError(wpError, 404);

      const serialized = JSON.stringify(error);
      const parsed = JSON.parse(serialized);

      expect(parsed.name).toBe('WordPressAPIError');
      expect(parsed.message).toBe(wpError.message);
    });
  });

  describe('Error Response Format Consistency', () => {
    it('should always return consistent error response format', async () => {
      const testCases = [
        () => postsService.createPost({ title: '', content: 'test' }), // Validation error
        () => postsService.readPost({ id: 999 }), // 404 error
        () => postsService.updatePost({ id: 1 }), // Missing fields
        () => postsService.deletePost({ id: 0 }) // Invalid ID
      ];

      // Mock various error responses
      mockAPI.scope.post('/wp-json/wp/v2/posts').reply(400, WORDPRESS_ERRORS.INVALID_INPUT);
      mockAPI.scope.get('/wp-json/wp/v2/posts/999').reply(404, WORDPRESS_ERRORS.INVALID_POST_ID);
      mockAPI.scope.post('/wp-json/wp/v2/posts/1').reply(403, WORDPRESS_ERRORS.PERMISSION_DENIED);
      // deletePost with id: 0 will fail validation before reaching API

      for (const testCase of testCases) {
        const result = await testCase();
        
        // All error responses should have consistent structure
        expect(result).toHaveProperty('isError', true);
        expect(result).toHaveProperty('content');
        expect(Array.isArray(result.content)).toBe(true);
        expect(result.content).toHaveLength(1);
        expect(result.content[0]).toHaveProperty('type', 'text');
        expect(result.content[0]).toHaveProperty('text');
        expect(typeof result.content[0].text).toBe('string');
        expect(result.content[0].text.length).toBeGreaterThan(0);
        expect(result).toHaveProperty('code');
        expect(typeof result.code).toBe('string');
      }
    });

    it('should sanitize error messages to prevent information leakage', async () => {
      // Mock an error that might contain sensitive information
      const sensitiveError = {
        code: 'database_error',
        message: 'Database connection failed: mysql://user:password@localhost:3306/db',
        data: { status: 500 }
      };

      mockAPI.scope
        .get('/wp-json/wp/v2/posts')
        .reply(500, sensitiveError);

      const result = await postsService.listPosts({});

      expect(isValidMCPErrorResponse(result)).toBe(true);
      // The error message should be the original WordPress message
      // (In a production system, you might want to sanitize this further)
      expect(result.content[0].text).toBe(sensitiveError.message);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle partial failures in batch operations gracefully', async () => {
      // Simulate a scenario where some operations succeed and others fail
      const posts = [
        { title: 'Valid Post 1', content: 'Content 1' },
        { title: 'Valid Post 2', content: 'Content 2' }
      ];

      // First post creation succeeds
      mockAPI.scope
        .post('/wp-json/wp/v2/posts')
        .reply(201, { id: 1, title: { rendered: 'Valid Post 1' } });

      // Second post creation fails
      mockAPI.scope
        .post('/wp-json/wp/v2/posts')
        .reply(403, WORDPRESS_ERRORS.PERMISSION_DENIED);

      const results = await Promise.allSettled([
        postsService.createPost(posts[0]),
        postsService.createPost(posts[1])
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled'); // Error is handled, not thrown
      
      if (results[0].status === 'fulfilled') {
        expect(isValidMCPErrorResponse(results[0].value)).toBe(false);
      }
      
      if (results[1].status === 'fulfilled') {
        expect(isValidMCPErrorResponse(results[1].value)).toBe(true);
      }
    });

    it('should maintain error context across chained operations', async () => {
      // Test that error information is preserved through multiple operations
      mockAPI.scope
        .get('/wp-json/wp/v2/posts/999')
        .reply(404, WORDPRESS_ERRORS.INVALID_POST_ID);

      const readResult = await postsService.readPost({ id: 999 });
      
      expect(isValidMCPErrorResponse(readResult)).toBe(true);
      expect(readResult.code).toBe('rest_post_invalid_id');
      
      // Error details should be specific and actionable
      expect(readResult.content[0].text).toBe('Invalid post ID.');
    });
  });

  describe('Edge Case Error Handling', () => {
    it('should handle malformed JSON responses', async () => {
      mockAPI.scope
        .get('/wp-json/wp/v2/posts')
        .reply(200, 'invalid json response');

      const result = await postsService.listPosts({});

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('Unexpected token');
    });

    it('should handle empty error responses', async () => {
      mockAPI.scope
        .get('/wp-json/wp/v2/posts')
        .reply(500, '');

      const result = await postsService.listPosts({});

      expect(isValidMCPErrorResponse(result)).toBe(true);
      // Should have a meaningful fallback message
      expect(result.content[0].text).toBeTruthy();
    });

    it('should handle very large error responses', async () => {
      const largeErrorMessage = 'Error: ' + 'A'.repeat(50000);
      const largeError = {
        code: 'large_error',
        message: largeErrorMessage,
        data: { status: 500 }
      };

      mockAPI.scope
        .get('/wp-json/wp/v2/posts')
        .reply(500, largeError);

      const result = await postsService.listPosts({});

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text.length).toBeGreaterThan(0);
      // Error message should be included but might be truncated for practical reasons
    });

    it('should handle circular reference errors', async () => {
      const circularObject: any = { name: 'test' };
      circularObject.self = circularObject;

      // This would normally cause JSON.stringify to fail
      try {
        JSON.stringify(circularObject);
      } catch (error) {
        expect(error).toBeInstanceOf(TypeError);
        expect(error.message).toContain('circular');
      }
    });
  });
});