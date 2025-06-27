/**
 * Performance testing framework for WordPress MCP Server
 */

import { WordPressAuthenticator } from '../../src/auth.js';
import { WordPressPostsService } from '../../src/services/posts.js';
import { WordPressMediaService } from '../../src/services/media.js';
import { WordPressConfig } from '../../src/types.js';
import { 
  WordPressAPIMock, 
  createTestEnvironment,
  WordPressMockData,
  measureExecutionTime,
  createLargeDataSet
} from '../utils/test-helpers.js';
import nock from 'nock';

// Performance test configuration
const PERFORMANCE_THRESHOLDS = {
  authentication: 2000, // 2 seconds
  postCreation: 3000, // 3 seconds
  postRetrieval: 1000, // 1 second
  postUpdate: 2000, // 2 seconds
  postDeletion: 1000, // 1 second
  postListing: 2000, // 2 seconds
  mediaUpload: 10000, // 10 seconds
  mediaRetrieval: 1000, // 1 second
  concurrentOperations: 5000, // 5 seconds for 10 concurrent operations
  largeDataSet: 5000, // 5 seconds for large data processing
  memoryUsage: 100 * 1024 * 1024 // 100MB
};

describe('Performance Tests', () => {
  let authenticator: WordPressAuthenticator;
  let postsService: WordPressPostsService;
  let mediaService: WordPressMediaService;
  let mockAPI: WordPressAPIMock;
  let testConfig: WordPressConfig;
  let cleanup: () => void;

  beforeEach(() => {
    const testEnv = createTestEnvironment();
    testConfig = testEnv.config.wordpress;
    cleanup = testEnv.cleanup;
    
    authenticator = new WordPressAuthenticator(testConfig);
    postsService = new WordPressPostsService(authenticator.getHttpClient());
    mediaService = new WordPressMediaService(authenticator.getHttpClient());
    mockAPI = new WordPressAPIMock(testConfig.site_url);
  });

  afterEach(() => {
    cleanup();
    nock.cleanAll();
  });

  describe('Authentication Performance', () => {
    it('should authenticate within performance threshold', async () => {
      mockAPI.mockAuthSuccess();

      const { result, duration } = await measureExecutionTime(async () => {
        return await authenticator.authenticate();
      });

      expect(result.success).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.authentication);
      
      console.log(`Authentication completed in ${duration.toFixed(2)}ms`);
    });

    it('should handle repeated authentication attempts efficiently', async () => {
      // Mock multiple successful authentication attempts
      for (let i = 0; i < 10; i++) {
        mockAPI.scope
          .get('/wp-json/wp/v2/users/me')
          .reply(200, WordPressMockData.createUser({ id: 1 }));
      }

      const { result, duration } = await measureExecutionTime(async () => {
        const results = [];
        for (let i = 0; i < 10; i++) {
          results.push(await authenticator.authenticate());
        }
        return results;
      });

      expect(result.every(r => r.success)).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.authentication * 5); // Allow 5x threshold for 10 operations
      
      console.log(`10 authentication attempts completed in ${duration.toFixed(2)}ms (avg: ${(duration/10).toFixed(2)}ms)`);
    });
  });

  describe('Post Operations Performance', () => {
    beforeEach(async () => {
      mockAPI.mockAuthSuccess();
      await authenticator.authenticate();
    });

    it('should create posts within performance threshold', async () => {
      const mockPost = WordPressMockData.createPost({ id: 1 });
      mockAPI.scope
        .post('/wp-json/wp/v2/posts')
        .reply(201, mockPost);

      const { result, duration } = await measureExecutionTime(async () => {
        return await postsService.createPost({
          title: 'Performance Test Post',
          content: '<p>This is a performance test post with some content.</p>'
        });
      });

      expect(result.isError).toBeUndefined();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.postCreation);
      
      console.log(`Post creation completed in ${duration.toFixed(2)}ms`);
    });

    it('should retrieve posts within performance threshold', async () => {
      const mockPost = WordPressMockData.createPost({ id: 1 });
      mockAPI.scope
        .get('/wp-json/wp/v2/posts/1')
        .reply(200, mockPost);

      const { result, duration } = await measureExecutionTime(async () => {
        return await postsService.readPost({ id: 1 });
      });

      expect(result.isError).toBeUndefined();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.postRetrieval);
      
      console.log(`Post retrieval completed in ${duration.toFixed(2)}ms`);
    });

    it('should update posts within performance threshold', async () => {
      const mockPost = WordPressMockData.createPost({ 
        id: 1, 
        title: { rendered: 'Updated Post' } 
      });
      mockAPI.scope
        .post('/wp-json/wp/v2/posts/1')
        .reply(200, mockPost);

      const { result, duration } = await measureExecutionTime(async () => {
        return await postsService.updatePost({
          id: 1,
          title: 'Updated Post'
        });
      });

      expect(result.isError).toBeUndefined();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.postUpdate);
      
      console.log(`Post update completed in ${duration.toFixed(2)}ms`);
    });

    it('should delete posts within performance threshold', async () => {
      const mockPost = WordPressMockData.createPost({ 
        id: 1, 
        status: 'trash' 
      });
      mockAPI.scope
        .delete('/wp-json/wp/v2/posts/1')
        .reply(200, mockPost);

      const { result, duration } = await measureExecutionTime(async () => {
        return await postsService.deletePost({ id: 1 });
      });

      expect(result.isError).toBeUndefined();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.postDeletion);
      
      console.log(`Post deletion completed in ${duration.toFixed(2)}ms`);
    });

    it('should list posts within performance threshold', async () => {
      const mockPosts = createLargeDataSet(
        (i) => WordPressMockData.createPost({ 
          id: i + 1, 
          title: { rendered: `Post ${i + 1}` } 
        }), 
        50
      );

      mockAPI.scope
        .get('/wp-json/wp/v2/posts')
        .query(true)
        .reply(200, mockPosts, {
          'X-WP-Total': '50',
          'X-WP-TotalPages': '5'
        });

      const { result, duration } = await measureExecutionTime(async () => {
        return await postsService.listPosts({ per_page: 50 });
      });

      expect(result.isError).toBeUndefined();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.postListing);
      
      console.log(`Post listing (50 posts) completed in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Media Operations Performance', () => {
    beforeEach(async () => {
      mockAPI.mockAuthSuccess();
      await authenticator.authenticate();
    });

    it('should retrieve media within performance threshold', async () => {
      const mockMedia = WordPressMockData.createMedia({ id: 1 });
      mockAPI.scope
        .get('/wp-json/wp/v2/media/1')
        .reply(200, mockMedia);

      const { result, duration } = await measureExecutionTime(async () => {
        return await mediaService.getMedia({ id: 1 });
      });

      expect(result.isError).toBeUndefined();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.mediaRetrieval);
      
      console.log(`Media retrieval completed in ${duration.toFixed(2)}ms`);
    });

    it('should list multiple media items efficiently', async () => {
      const mockMediaList = createLargeDataSet(
        (i) => WordPressMockData.createMedia({ 
          id: i + 1, 
          title: { rendered: `Media ${i + 1}` } 
        }), 
        25
      );

      mockAPI.scope
        .get('/wp-json/wp/v2/media')
        .query(true)
        .reply(200, mockMediaList, {
          'X-WP-Total': '25',
          'X-WP-TotalPages': '3'
        });

      const { result, duration } = await measureExecutionTime(async () => {
        return await mediaService.getMedia({ per_page: 25 });
      });

      expect(result.isError).toBeUndefined();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.mediaRetrieval);
      
      console.log(`Media listing (25 items) completed in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Concurrent Operations Performance', () => {
    beforeEach(async () => {
      mockAPI.mockAuthSuccess();
      await authenticator.authenticate();
    });

    it('should handle concurrent post reads efficiently', async () => {
      // Mock 10 different posts
      for (let i = 1; i <= 10; i++) {
        mockAPI.scope
          .get(`/wp-json/wp/v2/posts/${i}`)
          .reply(200, WordPressMockData.createPost({ 
            id: i, 
            title: { rendered: `Concurrent Post ${i}` } 
          }));
      }

      const { result, duration } = await measureExecutionTime(async () => {
        const promises = Array.from({ length: 10 }, (_, i) => 
          postsService.readPost({ id: i + 1 })
        );
        return await Promise.all(promises);
      });

      expect(result.every(r => !r.isError)).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.concurrentOperations);
      
      console.log(`10 concurrent post reads completed in ${duration.toFixed(2)}ms`);
    });

    it('should handle concurrent post creations efficiently', async () => {
      // Mock 5 post creations
      for (let i = 1; i <= 5; i++) {
        mockAPI.scope
          .post('/wp-json/wp/v2/posts')
          .reply(201, WordPressMockData.createPost({ 
            id: i, 
            title: { rendered: `Concurrent Creation ${i}` } 
          }));
      }

      const { result, duration } = await measureExecutionTime(async () => {
        const promises = Array.from({ length: 5 }, (_, i) => 
          postsService.createPost({
            title: `Concurrent Creation ${i + 1}`,
            content: `Content for post ${i + 1}`
          })
        );
        return await Promise.all(promises);
      });

      expect(result.every(r => !r.isError)).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.concurrentOperations);
      
      console.log(`5 concurrent post creations completed in ${duration.toFixed(2)}ms`);
    });

    it('should handle mixed concurrent operations efficiently', async () => {
      // Mock various operations
      mockAPI.scope.get('/wp-json/wp/v2/posts/1').reply(200, WordPressMockData.createPost({ id: 1 }));
      mockAPI.scope.post('/wp-json/wp/v2/posts').reply(201, WordPressMockData.createPost({ id: 2 }));
      mockAPI.scope.post('/wp-json/wp/v2/posts/3').reply(200, WordPressMockData.createPost({ id: 3 }));
      mockAPI.scope.get('/wp-json/wp/v2/posts').query(true).reply(200, []);
      mockAPI.scope.get('/wp-json/wp/v2/media/1').reply(200, WordPressMockData.createMedia({ id: 1 }));

      const { result, duration } = await measureExecutionTime(async () => {
        return await Promise.all([
          postsService.readPost({ id: 1 }),
          postsService.createPost({ title: 'New Post', content: 'Content' }),
          postsService.updatePost({ id: 3, title: 'Updated Post' }),
          postsService.listPosts({}),
          mediaService.getMedia({ id: 1 })
        ]);
      });

      expect(result.every(r => !r.isError)).toBe(true);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.concurrentOperations);
      
      console.log(`5 mixed concurrent operations completed in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Large Dataset Performance', () => {
    beforeEach(async () => {
      mockAPI.mockAuthSuccess();
      await authenticator.authenticate();
    });

    it('should handle large post listings efficiently', async () => {
      const largeMockPosts = createLargeDataSet(
        (i) => WordPressMockData.createPost({ 
          id: i + 1, 
          title: { rendered: `Large Dataset Post ${i + 1}` },
          content: { rendered: `<p>Content for post ${i + 1} with substantial text content to simulate real-world usage.</p>`.repeat(5) }
        }), 
        100
      );

      mockAPI.scope
        .get('/wp-json/wp/v2/posts')
        .query(true)
        .reply(200, largeMockPosts, {
          'X-WP-Total': '100',
          'X-WP-TotalPages': '1'
        });

      const { result, duration } = await measureExecutionTime(async () => {
        return await postsService.listPosts({ per_page: 100 });
      });

      expect(result.isError).toBeUndefined();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.largeDataSet);
      
      console.log(`Large dataset processing (100 posts) completed in ${duration.toFixed(2)}ms`);
    });

    it('should handle complex post data efficiently', async () => {
      const complexPost = WordPressMockData.createPost({
        id: 1,
        title: { rendered: 'Complex Post' },
        content: { rendered: '<p>Complex content</p>'.repeat(1000) }, // Large content
        meta: Object.fromEntries(
          Array.from({ length: 50 }, (_, i) => [`meta_field_${i}`, `value_${i}`])
        ), // Many meta fields
        categories: Array.from({ length: 10 }, (_, i) => i + 1), // Multiple categories
        tags: Array.from({ length: 20 }, (_, i) => `tag_${i}`) // Multiple tags
      });

      mockAPI.scope
        .get('/wp-json/wp/v2/posts/1')
        .reply(200, complexPost);

      const { result, duration } = await measureExecutionTime(async () => {
        return await postsService.readPost({ id: 1, include_meta: true });
      });

      expect(result.isError).toBeUndefined();
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.postRetrieval * 2); // Allow 2x threshold for complex data
      
      console.log(`Complex post processing completed in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage Performance', () => {
    it('should maintain reasonable memory usage during operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      mockAPI.mockAuthSuccess();
      await authenticator.authenticate();

      // Perform multiple operations
      const operations = Array.from({ length: 20 }, (_, i) => {
        mockAPI.scope
          .get(`/wp-json/wp/v2/posts/${i + 1}`)
          .reply(200, WordPressMockData.createPost({ id: i + 1 }));
        
        return postsService.readPost({ id: i + 1 });
      });

      await Promise.all(operations);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage);
      
      console.log(`Memory increase: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    });

    it('should clean up resources after large operations', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Create large dataset
      const largePosts = createLargeDataSet(
        (i) => WordPressMockData.createPost({ 
          id: i + 1,
          content: { rendered: '<p>Large content</p>'.repeat(100) }
        }), 
        50
      );

      mockAPI.scope
        .get('/wp-json/wp/v2/posts')
        .query(true)
        .reply(200, largePosts);

      // Process large dataset multiple times
      for (let i = 0; i < 5; i++) {
        await postsService.listPosts({ per_page: 50 });
      }

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      expect(memoryIncrease).toBeLessThan(PERFORMANCE_THRESHOLDS.memoryUsage);
      
      console.log(`Memory increase after large operations: ${Math.round(memoryIncrease / 1024 / 1024)}MB`);
    });
  });

  describe('Network Simulation Performance', () => {
    it('should handle network delays gracefully', async () => {
      mockAPI.scope
        .get('/wp-json/wp/v2/posts/1')
        .delayConnection(500) // 500ms network delay
        .reply(200, WordPressMockData.createPost({ id: 1 }));

      const { result, duration } = await measureExecutionTime(async () => {
        return await postsService.readPost({ id: 1 });
      });

      expect(result.isError).toBeUndefined();
      expect(duration).toBeGreaterThan(500); // Should account for network delay
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.postRetrieval + 1000); // Allow for delay
      
      console.log(`Post retrieval with 500ms network delay completed in ${duration.toFixed(2)}ms`);
    });

    it('should handle varying network conditions', async () => {
      const delays = [100, 200, 300, 150, 250]; // Variable network delays
      
      delays.forEach((delay, i) => {
        mockAPI.scope
          .get(`/wp-json/wp/v2/posts/${i + 1}`)
          .delayConnection(delay)
          .reply(200, WordPressMockData.createPost({ id: i + 1 }));
      });

      const { result, duration } = await measureExecutionTime(async () => {
        const promises = delays.map((_, i) => 
          postsService.readPost({ id: i + 1 })
        );
        return await Promise.all(promises);
      });

      expect(result.every(r => !r.isError)).toBe(true);
      
      // Should complete faster than sequential processing due to parallelism
      const maxSequentialTime = delays.reduce((sum, delay) => sum + delay, 0) + 
                               (delays.length * PERFORMANCE_THRESHOLDS.postRetrieval);
      expect(duration).toBeLessThan(maxSequentialTime);
      
      console.log(`5 requests with variable delays completed in ${duration.toFixed(2)}ms`);
    });
  });

  describe('Stress Testing', () => {
    it('should handle burst of requests without degradation', async () => {
      const burstSize = 25;
      
      // Mock burst of post reads
      for (let i = 1; i <= burstSize; i++) {
        mockAPI.scope
          .get(`/wp-json/wp/v2/posts/${i}`)
          .reply(200, WordPressMockData.createPost({ id: i }));
      }

      const { result, duration } = await measureExecutionTime(async () => {
        const promises = Array.from({ length: burstSize }, (_, i) => 
          postsService.readPost({ id: i + 1 })
        );
        return await Promise.all(promises);
      });

      expect(result.every(r => !r.isError)).toBe(true);
      
      // Average time per request should be reasonable
      const avgTimePerRequest = duration / burstSize;
      expect(avgTimePerRequest).toBeLessThan(PERFORMANCE_THRESHOLDS.postRetrieval);
      
      console.log(`Burst of ${burstSize} requests completed in ${duration.toFixed(2)}ms (avg: ${avgTimePerRequest.toFixed(2)}ms per request)`);
    });
  });
});