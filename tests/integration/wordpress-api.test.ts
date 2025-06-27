/**
 * Integration tests for WordPress REST API communication
 * These tests use nock to mock the actual HTTP requests to WordPress
 */

import { WordPressAuthenticator } from '../../src/auth.js';
import { WordPressPostsService } from '../../src/services/posts.js';
import { WordPressConfig } from '../../src/types.js';
import { 
  WordPressAPIMock, 
  createTestEnvironment,
  WordPressMockData,
  WORDPRESS_ERRORS,
  isValidMCPResponse,
  isValidMCPErrorResponse
} from '../utils/test-helpers.js';
import nock from 'nock';

describe('WordPress API Integration Tests', () => {
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

  describe('Authentication Flow', () => {
    it('should complete full authentication workflow', async () => {
      // Mock connection test
      nock(testConfig.site_url)
        .get('/wp-json/')
        .reply(200, {
          name: 'Test WordPress Site',
          description: 'Test site',
          url: testConfig.site_url,
          namespaces: ['wp/v2']
        });

      // Mock authentication
      mockAPI.mockAuthSuccess();

      // Test connection
      const connectionResult = await authenticator.testConnection();
      expect(connectionResult.success).toBe(true);

      // Test authentication
      const authResult = await authenticator.authenticate();
      expect(authResult.success).toBe(true);
      expect(authResult.user).toBeDefined();
      expect(authenticator.isAuthenticatedUser()).toBe(true);
    });

    it('should handle authentication failure gracefully', async () => {
      mockAPI.mockAuthFailure();

      const authResult = await authenticator.authenticate();
      expect(authResult.success).toBe(false);
      expect(authResult.error).toBeDefined();
      expect(authenticator.isAuthenticatedUser()).toBe(false);
    });
  });

  describe('Post Management Workflow', () => {
    beforeEach(async () => {
      // Authenticate before each test
      mockAPI.mockAuthSuccess();
      await authenticator.authenticate();
    });

    it('should complete full CRUD workflow for posts', async () => {
      // 1. Create a post
      const createInput = {
        title: 'Integration Test Post',
        content: '<p>This is a test post created during integration testing.</p>',
        status: 'draft' as const,
        type: 'post' as const
      };

      const createdPost = WordPressMockData.createPost({
        id: 100,
        title: { rendered: createInput.title },
        status: createInput.status,
        link: 'https://test-wp-site.com/integration-test-post'
      });

      mockAPI.scope
        .post('/wp-json/wp/v2/posts')
        .reply(201, createdPost);

      const createResult = await postsService.createPost(createInput);
      expect(isValidMCPResponse(createResult)).toBe(true);
      expect(createResult.content[0].text).toContain('Successfully created post');

      // 2. Read the created post
      mockAPI.scope
        .get('/wp-json/wp/v2/posts/100')
        .reply(200, createdPost);

      const readResult = await postsService.readPost({ id: 100 });
      expect(isValidMCPResponse(readResult)).toBe(true);
      expect(readResult.content[0].text).toContain('Integration Test Post');

      // 3. Update the post
      const updatedPost = WordPressMockData.createPost({
        ...createdPost,
        title: { rendered: 'Updated Integration Test Post' },
        status: 'publish'
      });

      mockAPI.scope
        .post('/wp-json/wp/v2/posts/100')
        .reply(200, updatedPost);

      const updateResult = await postsService.updatePost({
        id: 100,
        title: 'Updated Integration Test Post',
        status: 'publish'
      });
      expect(isValidMCPResponse(updateResult)).toBe(true);
      expect(updateResult.content[0].text).toContain('Successfully updated post');

      // 4. List posts (should include our post)
      mockAPI.scope
        .get('/wp-json/wp/v2/posts')
        .query(true)
        .reply(200, [updatedPost], {
          'X-WP-Total': '1',
          'X-WP-TotalPages': '1'
        });

      const listResult = await postsService.listPosts({});
      expect(isValidMCPResponse(listResult)).toBe(true);
      expect(listResult.content[0].text).toContain('Found 1 posts');

      // 5. Delete the post (trash)
      const trashedPost = WordPressMockData.createPost({
        ...updatedPost,
        status: 'trash'
      });

      mockAPI.scope
        .delete('/wp-json/wp/v2/posts/100')
        .query({ force: false })
        .reply(200, trashedPost);

      const deleteResult = await postsService.deletePost({ id: 100, force: false });
      expect(isValidMCPResponse(deleteResult)).toBe(true);
      expect(deleteResult.content[0].text).toContain('moved to trash');
    });

    it('should handle post search and filtering', async () => {
      const searchPosts = [
        WordPressMockData.createPost({ 
          id: 1, 
          title: { rendered: 'WordPress Tutorial' },
          categories: [1],
          tags: [1, 2]
        }),
        WordPressMockData.createPost({ 
          id: 2, 
          title: { rendered: 'Advanced WordPress Tips' },
          categories: [1],
          tags: [2, 3]
        })
      ];

      mockAPI.scope
        .get('/wp-json/wp/v2/posts')
        .query({
          per_page: 10,
          page: 1,
          orderby: 'date',
          order: 'desc',
          search: 'WordPress',
          categories: '1',
          tags: '2'
        })
        .reply(200, searchPosts, {
          'X-WP-Total': '2',
          'X-WP-TotalPages': '1'
        });

      const searchResult = await postsService.listPosts({
        search: 'WordPress',
        categories: [1],
        tags: [2]
      });

      expect(isValidMCPResponse(searchResult)).toBe(true);
      expect(searchResult.content[0].text).toContain('Found 2 posts');
      expect(searchResult.content[0].text).toContain('WordPress Tutorial');
      expect(searchResult.content[0].text).toContain('Advanced WordPress Tips');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle WordPress API errors consistently', async () => {
      // Test invalid post ID
      mockAPI.scope
        .get('/wp-json/wp/v2/posts/999')
        .reply(404, WORDPRESS_ERRORS.INVALID_POST_ID);

      const result = await postsService.readPost({ id: 999 });
      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('Invalid post ID.');
    });

    it('should handle permission errors', async () => {
      mockAPI.scope
        .post('/wp-json/wp/v2/posts')
        .reply(403, WORDPRESS_ERRORS.PERMISSION_DENIED);

      const result = await postsService.createPost({
        title: 'Test Post',
        content: 'Test content'
      });

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('not allowed to edit');
    });

    it('should handle rate limiting', async () => {
      mockAPI.scope
        .get('/wp-json/wp/v2/posts')
        .reply(429, WORDPRESS_ERRORS.RATE_LIMITED);

      const result = await postsService.listPosts({});
      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('Too many requests');
    });

    it('should handle server errors', async () => {
      mockAPI.scope
        .get('/wp-json/wp/v2/posts')
        .reply(500, WORDPRESS_ERRORS.SERVER_ERROR);

      const result = await postsService.listPosts({});
      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('Internal server error');
    });
  });

  describe('Network Resilience', () => {
    it('should handle network connectivity issues', async () => {
      mockAPI.scope
        .get('/wp-json/wp/v2/posts')
        .replyWithError('Network Error');

      const result = await postsService.listPosts({});
      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('Network Error');
    });

    it('should handle timeout scenarios', async () => {
      mockAPI.scope
        .get('/wp-json/wp/v2/posts')
        .delayConnection(testConfig.timeout + 1000)
        .reply(200, []);

      const result = await postsService.listPosts({});
      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('timeout');
    });

    it('should handle DNS resolution failures', async () => {
      mockAPI.scope
        .get('/wp-json/wp/v2/posts')
        .replyWithError({ code: 'ENOTFOUND' });

      const result = await postsService.listPosts({});
      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('Cannot connect to WordPress site');
    });
  });

  describe('Data Integrity', () => {
    it('should preserve post data through create-read cycle', async () => {
      const originalData = {
        title: 'Data Integrity Test',
        content: '<p>This is <strong>rich</strong> content with <em>formatting</em>.</p>',
        status: 'draft' as const,
        type: 'post' as const,
        categories: [1, 2],
        tags: ['test', 'integration'],
        excerpt: 'This is an excerpt',
        meta: { custom_field: 'custom_value', number_field: 42 }
      };

      const createdPost = WordPressMockData.createPost({
        id: 200,
        title: { rendered: originalData.title },
        content: { rendered: originalData.content },
        status: originalData.status,
        categories: originalData.categories,
        excerpt: { rendered: originalData.excerpt },
        meta: originalData.meta
      });

      // Mock create
      mockAPI.scope
        .post('/wp-json/wp/v2/posts')
        .reply(201, createdPost);

      const createResult = await postsService.createPost(originalData);
      expect(isValidMCPResponse(createResult)).toBe(true);

      // Mock read with meta
      mockAPI.scope
        .get('/wp-json/wp/v2/posts/200')
        .reply(200, createdPost);

      const readResult = await postsService.readPost({ id: 200, include_meta: true });
      expect(isValidMCPResponse(readResult)).toBe(true);
      
      // Verify data integrity
      expect(readResult.content[0].text).toContain(originalData.title);
      expect(readResult.content[0].text).toContain(originalData.content);
      expect(readResult.content[0].text).toContain('custom_field: "custom_value"');
      expect(readResult.content[0].text).toContain('number_field: 42');
    });

    it('should handle special characters and Unicode correctly', async () => {
      const unicodeData = {
        title: 'Test with émojis 🎉 and spëcial çharacters',
        content: '<p>Content with 中文, العربية, and русский text.</p>'
      };

      const createdPost = WordPressMockData.createPost({
        id: 201,
        title: { rendered: unicodeData.title },
        content: { rendered: unicodeData.content }
      });

      mockAPI.scope
        .post('/wp-json/wp/v2/posts')
        .reply(201, createdPost);

      const result = await postsService.createPost(unicodeData);
      expect(isValidMCPResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('émojis 🎉');
    });
  });

  describe('Pagination', () => {
    it('should handle paginated results correctly', async () => {
      const page1Posts = Array.from({ length: 5 }, (_, i) => 
        WordPressMockData.createPost({ 
          id: i + 1, 
          title: { rendered: `Post ${i + 1}` } 
        })
      );

      const page2Posts = Array.from({ length: 3 }, (_, i) => 
        WordPressMockData.createPost({ 
          id: i + 6, 
          title: { rendered: `Post ${i + 6}` } 
        })
      );

      // Mock page 1
      mockAPI.scope
        .get('/wp-json/wp/v2/posts')
        .query({ per_page: 5, page: 1, orderby: 'date', order: 'desc' })
        .reply(200, page1Posts, {
          'X-WP-Total': '8',
          'X-WP-TotalPages': '2'
        });

      const page1Result = await postsService.listPosts({ per_page: 5, page: 1 });
      expect(isValidMCPResponse(page1Result)).toBe(true);
      expect(page1Result.content[0].text).toContain('Found 5 posts (Page 1 of 2, 8 total)');

      // Mock page 2
      mockAPI.scope
        .get('/wp-json/wp/v2/posts')
        .query({ per_page: 5, page: 2, orderby: 'date', order: 'desc' })
        .reply(200, page2Posts, {
          'X-WP-Total': '8',
          'X-WP-TotalPages': '2'
        });

      const page2Result = await postsService.listPosts({ per_page: 5, page: 2 });
      expect(isValidMCPResponse(page2Result)).toBe(true);
      expect(page2Result.content[0].text).toContain('Found 3 posts (Page 2 of 2, 8 total)');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle multiple simultaneous requests', async () => {
      // Mock multiple posts for concurrent reads
      for (let i = 1; i <= 5; i++) {
        const post = WordPressMockData.createPost({ 
          id: i, 
          title: { rendered: `Concurrent Post ${i}` } 
        });
        
        mockAPI.scope
          .get(`/wp-json/wp/v2/posts/${i}`)
          .reply(200, post);
      }

      // Execute concurrent reads
      const concurrentReads = Array.from({ length: 5 }, (_, i) => 
        postsService.readPost({ id: i + 1 })
      );

      const results = await Promise.all(concurrentReads);

      // All requests should succeed
      results.forEach((result, index) => {
        expect(isValidMCPResponse(result)).toBe(true);
        expect(result.content[0].text).toContain(`Concurrent Post ${index + 1}`);
      });
    });
  });
});