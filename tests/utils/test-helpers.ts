import nock from 'nock';
import { 
  WordPressPost, 
  WordPressCategory, 
  WordPressTag, 
  WordPressMedia, 
  WordPressUser,
  WordPressComment,
  WordPressError,
  WordPressMockData,
  createMockAxiosResponse,
  WORDPRESS_ERRORS
} from '../mocks/wordpress-api.js';

// Test Configuration
export interface TestConfig {
  wordpress: {
    site_url: string;
    username: string;
    app_password: string;
    verify_ssl: boolean;
    timeout: number;
  };
}

export const DEFAULT_TEST_CONFIG: TestConfig = {
  wordpress: {
    site_url: 'https://test-wp-site.com',
    username: 'testuser',
    app_password: 'test password 123',
    verify_ssl: true,
    timeout: 30000
  }
};

// WordPress API Mock Helper
export class WordPressAPIMock {
  private baseUrl: string;
  private scope: nock.Scope;

  constructor(baseUrl = DEFAULT_TEST_CONFIG.wordpress.site_url) {
    this.baseUrl = baseUrl;
    this.scope = nock(baseUrl);
  }

  // Authentication mocks
  mockAuthSuccess(): this {
    this.scope
      .get('/wp-json/wp/v2/users/me')
      .reply(200, WordPressMockData.createUser());
    return this;
  }

  mockAuthFailure(): this {
    this.scope
      .get('/wp-json/wp/v2/users/me')
      .reply(401, WORDPRESS_ERRORS.INVALID_CREDENTIALS);
    return this;
  }

  // Post CRUD mocks
  mockCreatePost(post: Partial<WordPressPost> = {}): this {
    const mockPost = WordPressMockData.createPost(post);
    this.scope
      .post('/wp-json/wp/v2/posts')
      .reply(201, mockPost);
    return this;
  }

  mockCreatePostFailure(error: WordPressError = WORDPRESS_ERRORS.INVALID_INPUT): this {
    this.scope
      .post('/wp-json/wp/v2/posts')
      .reply(error.data.status, error);
    return this;
  }

  mockGetPost(id: number, post: Partial<WordPressPost> = {}): this {
    const mockPost = WordPressMockData.createPost({ id, ...post });
    this.scope
      .get(`/wp-json/wp/v2/posts/${id}`)
      .reply(200, mockPost);
    return this;
  }

  mockGetPostFailure(id: number, error: WordPressError = WORDPRESS_ERRORS.INVALID_POST_ID): this {
    this.scope
      .get(`/wp-json/wp/v2/posts/${id}`)
      .reply(error.data.status, error);
    return this;
  }

  mockUpdatePost(id: number, post: Partial<WordPressPost> = {}): this {
    const mockPost = WordPressMockData.createPost({ id, ...post });
    this.scope
      .post(`/wp-json/wp/v2/posts/${id}`)
      .reply(200, mockPost);
    return this;
  }

  mockUpdatePostFailure(id: number, error: WordPressError = WORDPRESS_ERRORS.PERMISSION_DENIED): this {
    this.scope
      .post(`/wp-json/wp/v2/posts/${id}`)
      .reply(error.data.status, error);
    return this;
  }

  mockDeletePost(id: number, force = false): this {
    const response = force ? 
      { deleted: true, previous: WordPressMockData.createPost({ id }) } :
      WordPressMockData.createPost({ id, status: 'trash' });
    
    this.scope
      .delete(`/wp-json/wp/v2/posts/${id}`)
      .query({ force: force.toString() })
      .reply(200, response);
    return this;
  }

  mockDeletePostFailure(id: number, error: WordPressError = WORDPRESS_ERRORS.INVALID_POST_ID): this {
    this.scope
      .delete(`/wp-json/wp/v2/posts/${id}`)
      .reply(error.data.status, error);
    return this;
  }

  mockListPosts(posts: WordPressPost[] = []): this {
    const mockPosts = posts.length > 0 ? posts : [
      WordPressMockData.createPost({ id: 1, title: { rendered: 'Post 1' } }),
      WordPressMockData.createPost({ id: 2, title: { rendered: 'Post 2' } }),
      WordPressMockData.createPost({ id: 3, title: { rendered: 'Post 3' } })
    ];

    this.scope
      .get('/wp-json/wp/v2/posts')
      .query(true) // Accept any query parameters
      .reply(200, mockPosts, {
        'X-WP-Total': mockPosts.length.toString(),
        'X-WP-TotalPages': '1'
      });
    return this;
  }

  // Media mocks
  mockUploadMedia(media: Partial<WordPressMedia> = {}): this {
    const mockMedia = WordPressMockData.createMedia(media);
    this.scope
      .post('/wp-json/wp/v2/media')
      .reply(201, mockMedia);
    return this;
  }

  mockUploadMediaFailure(error: WordPressError = WORDPRESS_ERRORS.INVALID_INPUT): this {
    this.scope
      .post('/wp-json/wp/v2/media')
      .reply(error.data.status, error);
    return this;
  }

  mockGetMedia(id: number, media: Partial<WordPressMedia> = {}): this {
    const mockMedia = WordPressMockData.createMedia({ id, ...media });
    this.scope
      .get(`/wp-json/wp/v2/media/${id}`)
      .reply(200, mockMedia);
    return this;
  }

  mockListMedia(media: WordPressMedia[] = []): this {
    const mockMedia = media.length > 0 ? media : [
      WordPressMockData.createMedia({ id: 1, title: { rendered: 'Media 1' } }),
      WordPressMockData.createMedia({ id: 2, title: { rendered: 'Media 2' } })
    ];

    this.scope
      .get('/wp-json/wp/v2/media')
      .query(true)
      .reply(200, mockMedia);
    return this;
  }

  // Category mocks
  mockCreateCategory(category: Partial<WordPressCategory> = {}): this {
    const mockCategory = WordPressMockData.createCategory(category);
    this.scope
      .post('/wp-json/wp/v2/categories')
      .reply(201, mockCategory);
    return this;
  }

  mockListCategories(categories: WordPressCategory[] = []): this {
    const mockCategories = categories.length > 0 ? categories : [
      WordPressMockData.createCategory({ id: 1, name: 'Category 1' }),
      WordPressMockData.createCategory({ id: 2, name: 'Category 2' })
    ];

    this.scope
      .get('/wp-json/wp/v2/categories')
      .query(true)
      .reply(200, mockCategories);
    return this;
  }

  // Tag mocks
  mockCreateTag(tag: Partial<WordPressTag> = {}): this {
    const mockTag = WordPressMockData.createTag(tag);
    this.scope
      .post('/wp-json/wp/v2/tags')
      .reply(201, mockTag);
    return this;
  }

  mockListTags(tags: WordPressTag[] = []): this {
    const mockTags = tags.length > 0 ? tags : [
      WordPressMockData.createTag({ id: 1, name: 'Tag 1' }),
      WordPressMockData.createTag({ id: 2, name: 'Tag 2' })
    ];

    this.scope
      .get('/wp-json/wp/v2/tags')
      .query(true)
      .reply(200, mockTags);
    return this;
  }

  // User mocks
  mockListUsers(users: WordPressUser[] = []): this {
    const mockUsers = users.length > 0 ? users : [
      WordPressMockData.createUser({ id: 1, name: 'User 1' }),
      WordPressMockData.createUser({ id: 2, name: 'User 2' })
    ];

    this.scope
      .get('/wp-json/wp/v2/users')
      .query(true)
      .reply(200, mockUsers);
    return this;
  }

  // Comment mocks
  mockListComments(comments: WordPressComment[] = []): this {
    const mockComments = comments.length > 0 ? comments : [
      WordPressMockData.createComment({ id: 1, author_name: 'Commenter 1' }),
      WordPressMockData.createComment({ id: 2, author_name: 'Commenter 2' })
    ];

    this.scope
      .get('/wp-json/wp/v2/comments')
      .query(true)
      .reply(200, mockComments);
    return this;
  }

  // Network error mocks
  mockNetworkError(path = '/wp-json/wp/v2/posts'): this {
    this.scope
      .get(path)
      .replyWithError('Network Error');
    return this;
  }

  mockTimeout(path = '/wp-json/wp/v2/posts'): this {
    this.scope
      .get(path)
      .delayConnection(31000) // Delay longer than typical timeout
      .reply(200, {});
    return this;
  }

  mockServerError(path = '/wp-json/wp/v2/posts'): this {
    this.scope
      .get(path)
      .reply(500, WORDPRESS_ERRORS.SERVER_ERROR);
    return this;
  }

  mockRateLimit(path = '/wp-json/wp/v2/posts'): this {
    this.scope
      .get(path)
      .reply(429, WORDPRESS_ERRORS.RATE_LIMITED);
    return this;
  }

  // Utility methods
  done(): void {
    this.scope.done();
  }

  isDone(): boolean {
    return this.scope.isDone();
  }

  cleanAll(): void {
    nock.cleanAll();
  }

  persist(): this {
    this.scope.persist();
    return this;
  }
}

// MCP Response Helpers
export interface MCPToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

export interface MCPErrorResponse {
  isError: true;
  content: Array<{
    type: 'text';
    text: string;
  }>;
  code?: string;
}

export function createMCPSuccessResponse(text: string): MCPToolResponse {
  return {
    content: [{
      type: 'text',
      text
    }]
  };
}

export function createMCPErrorResponse(text: string, code?: string): MCPErrorResponse {
  return {
    isError: true,
    content: [{
      type: 'text',
      text
    }],
    code
  };
}

// Test Data Validation Helpers
export function isValidWordPressPost(obj: any): obj is WordPressPost {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'number' &&
    typeof obj.title === 'object' &&
    typeof obj.title.rendered === 'string' &&
    typeof obj.content === 'object' &&
    typeof obj.content.rendered === 'string' &&
    typeof obj.status === 'string' &&
    typeof obj.type === 'string';
}

export function isValidMCPResponse(obj: any): obj is MCPToolResponse {
  return obj &&
    typeof obj === 'object' &&
    Array.isArray(obj.content) &&
    obj.content.every((item: any) => 
      item && 
      typeof item === 'object' &&
      item.type === 'text' &&
      typeof item.text === 'string'
    );
}

export function isValidMCPErrorResponse(obj: any): obj is MCPErrorResponse {
  return obj &&
    typeof obj === 'object' &&
    obj.isError === true &&
    Array.isArray(obj.content) &&
    obj.content.every((item: any) => 
      item && 
      typeof item === 'object' &&
      item.type === 'text' &&
      typeof item.text === 'string'
    );
}

// Performance Testing Helpers
export function measureExecutionTime<T>(fn: () => Promise<T>): Promise<{ result: T; duration: number }> {
  const start = process.hrtime.bigint();
  return fn().then(result => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    return { result, duration };
  });
}

export function createLargeDataSet<T>(generator: (index: number) => T, count: number): T[] {
  return Array.from({ length: count }, (_, index) => generator(index));
}

// File System Helpers for Media Upload Tests
export function createMockFile(name: string, size: number, mimeType: string): Buffer {
  const buffer = Buffer.alloc(size);
  buffer.fill(0);
  return buffer;
}

export function createMockImageFile(): Buffer {
  // Simple 1x1 pixel PNG file
  return Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
    0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
    0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
    0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x25,
    0xDB, 0x56, 0xCA, 0x00, 0x00, 0x00, 0x00, 0x49,
    0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);
}

// Configuration Helpers
export function createTestEnvironment(): { config: TestConfig; cleanup: () => void } {
  const originalEnv = { ...process.env };
  
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.WORDPRESS_SITE_URL = DEFAULT_TEST_CONFIG.wordpress.site_url;
  process.env.WORDPRESS_USERNAME = DEFAULT_TEST_CONFIG.wordpress.username;
  process.env.WORDPRESS_APP_PASSWORD = DEFAULT_TEST_CONFIG.wordpress.app_password;

  const cleanup = () => {
    process.env = originalEnv;
    nock.cleanAll();
  };

  return {
    config: DEFAULT_TEST_CONFIG,
    cleanup
  };
}

// Async Test Helpers
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 100
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries) {
        await waitFor(delayMs * Math.pow(2, i)); // Exponential backoff
      }
    }
  }
  
  throw lastError!;
}