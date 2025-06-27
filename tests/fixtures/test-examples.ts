/**
 * Test examples and code snippets for documentation
 * This file contains practical examples of how to use the testing framework
 */

import { WordPressPostsService } from '../../src/services/posts.js';
import { WordPressMediaService } from '../../src/services/media.js';
import { WordPressAuthenticator } from '../../src/auth.js';
import { 
  WordPressAPIMock,
  WordPressMockData,
  createTestEnvironment,
  isValidMCPResponse,
  isValidMCPErrorResponse,
  measureExecutionTime
} from '../utils/test-helpers.js';

/**
 * Example 1: Basic Unit Test
 * Tests a single function with mocked dependencies
 */
export const basicUnitTestExample = () => `
describe('Posts Service - Basic Unit Test', () => {
  let postsService: WordPressPostsService;
  let httpClient: jest.Mocked<AxiosInstance>;

  beforeEach(() => {
    httpClient = {
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn(),
    } as any;
    
    postsService = new WordPressPostsService(httpClient);
  });

  it('should create a post successfully', async () => {
    // Arrange
    const input = {
      title: 'Test Post',
      content: '<p>Test content</p>'
    };
    
    const mockResponse = {
      data: WordPressMockData.createPost({
        id: 123,
        title: { rendered: 'Test Post' }
      })
    };
    
    httpClient.post.mockResolvedValue(mockResponse);

    // Act
    const result = await postsService.createPost(input);

    // Assert
    expect(httpClient.post).toHaveBeenCalledWith('/wp-json/wp/v2/posts', {
      title: 'Test Post',
      content: '<p>Test content</p>',
      status: 'draft',
      type: 'post'
    });
    
    expect(isValidMCPResponse(result)).toBe(true);
    expect(result.content[0].text).toContain('Successfully created');
  });
});
`;

/**
 * Example 2: Integration Test
 * Tests complete workflow with mocked external APIs
 */
export const integrationTestExample = () => `
describe('Posts Workflow - Integration Test', () => {
  let authenticator: WordPressAuthenticator;
  let postsService: WordPressPostsService;
  let mockAPI: WordPressAPIMock;
  let cleanup: () => void;

  beforeEach(() => {
    const testEnv = createTestEnvironment();
    cleanup = testEnv.cleanup;
    
    authenticator = new WordPressAuthenticator(testEnv.config.wordpress);
    postsService = new WordPressPostsService(authenticator.getHttpClient());
    mockAPI = new WordPressAPIMock();
  });

  afterEach(() => {
    cleanup();
  });

  it('should complete full CRUD workflow', async () => {
    // Setup authentication
    mockAPI.mockAuthSuccess();
    const authResult = await authenticator.authenticate();
    expect(authResult.success).toBe(true);

    // 1. Create post
    const createInput = {
      title: 'Integration Test Post',
      content: '<p>Test content</p>',
      status: 'draft' as const
    };

    mockAPI.mockCreatePost({ 
      id: 100, 
      title: { rendered: createInput.title } 
    });

    const createResult = await postsService.createPost(createInput);
    expect(isValidMCPResponse(createResult)).toBe(true);

    // 2. Read post
    mockAPI.mockGetPost(100, { 
      title: { rendered: createInput.title } 
    });

    const readResult = await postsService.readPost({ id: 100 });
    expect(isValidMCPResponse(readResult)).toBe(true);
    expect(readResult.content[0].text).toContain('Integration Test Post');

    // 3. Update post
    mockAPI.mockUpdatePost(100, { 
      title: { rendered: 'Updated Post' } 
    });

    const updateResult = await postsService.updatePost({
      id: 100,
      title: 'Updated Post'
    });
    expect(isValidMCPResponse(updateResult)).toBe(true);

    // 4. Delete post
    mockAPI.mockDeletePost(100);

    const deleteResult = await postsService.deletePost({ id: 100 });
    expect(isValidMCPResponse(deleteResult)).toBe(true);
  });
});
`;

/**
 * Example 3: Error Handling Test
 * Tests various error scenarios and proper error responses
 */
export const errorHandlingTestExample = () => `
describe('Error Handling Examples', () => {
  let postsService: WordPressPostsService;
  let mockAPI: WordPressAPIMock;

  beforeEach(() => {
    const testEnv = createTestEnvironment();
    postsService = new WordPressPostsService(mockHttpClient);
    mockAPI = new WordPressAPIMock();
  });

  it('should handle validation errors properly', async () => {
    const invalidInput = {
      title: '', // Invalid: empty title
      content: 'Test content'
    };

    const result = await postsService.createPost(invalidInput);

    expect(isValidMCPErrorResponse(result)).toBe(true);
    expect(result.code).toBe('validation_error');
    expect(result.content[0].text).toContain('Invalid input');
  });

  it('should handle WordPress API errors', async () => {
    mockAPI.mockCreatePostFailure({
      code: 'rest_cannot_create',
      message: 'Sorry, you are not allowed to create posts.',
      data: { status: 403 }
    });

    const result = await postsService.createPost({
      title: 'Test Post',
      content: 'Test content'
    });

    expect(isValidMCPErrorResponse(result)).toBe(true);
    expect(result.code).toBe('rest_cannot_create');
    expect(result.content[0].text).toContain('not allowed to create');
  });

  it('should handle network errors gracefully', async () => {
    mockAPI.mockNetworkError('/wp-json/wp/v2/posts');

    const result = await postsService.createPost({
      title: 'Test Post',
      content: 'Test content'
    });

    expect(isValidMCPErrorResponse(result)).toBe(true);
    expect(result.code).toBe('unknown_error');
    expect(result.content[0].text).toContain('Network Error');
  });
});
`;

/**
 * Example 4: Performance Test
 * Tests operation timing and concurrent operations
 */
export const performanceTestExample = () => `
describe('Performance Test Examples', () => {
  let postsService: WordPressPostsService;
  let mockAPI: WordPressAPIMock;

  beforeEach(() => {
    const testEnv = createTestEnvironment();
    postsService = new WordPressPostsService(mockHttpClient);
    mockAPI = new WordPressAPIMock();
  });

  it('should create post within performance threshold', async () => {
    mockAPI.mockCreatePost();

    const { result, duration } = await measureExecutionTime(async () => {
      return await postsService.createPost({
        title: 'Performance Test Post',
        content: 'Test content'
      });
    });

    expect(isValidMCPResponse(result)).toBe(true);
    expect(duration).toBeLessThan(3000); // 3 second threshold
    
    console.log(\`Post creation completed in \${duration.toFixed(2)}ms\`);
  });

  it('should handle concurrent operations efficiently', async () => {
    // Mock multiple post reads
    for (let i = 1; i <= 10; i++) {
      mockAPI.mockGetPost(i, { 
        title: { rendered: \`Concurrent Post \${i}\` } 
      });
    }

    const { result, duration } = await measureExecutionTime(async () => {
      const promises = Array.from({ length: 10 }, (_, i) => 
        postsService.readPost({ id: i + 1 })
      );
      return await Promise.all(promises);
    });

    expect(result.every(r => isValidMCPResponse(r))).toBe(true);
    expect(duration).toBeLessThan(5000); // 5 second threshold for 10 operations
    
    console.log(\`10 concurrent reads completed in \${duration.toFixed(2)}ms\`);
  });
});
`;

/**
 * Example 5: Schema Validation Test
 * Tests input validation using Zod schemas
 */
export const schemaValidationTestExample = () => `
import { CreatePostSchema } from '../../src/types.js';

describe('Schema Validation Examples', () => {
  it('should validate valid post creation input', () => {
    const validInput = {
      title: 'Valid Post Title',
      content: '<p>Valid content</p>',
      status: 'draft' as const,
      type: 'post' as const,
      categories: [1, 2, 3],
      tags: ['tag1', 'tag2']
    };

    const result = CreatePostSchema.parse(validInput);
    expect(result).toEqual(validInput);
  });

  it('should reject invalid input', () => {
    const invalidInput = {
      title: '', // Invalid: empty title
      content: 'Valid content',
      status: 'invalid-status' // Invalid status
    };

    expect(() => CreatePostSchema.parse(invalidInput)).toThrow();
  });

  it('should apply default values', () => {
    const minimalInput = {
      title: 'Test Post',
      content: 'Test content'
    };

    const result = CreatePostSchema.parse(minimalInput);
    expect(result.status).toBe('draft');
    expect(result.type).toBe('post');
  });
});
`;

/**
 * Example 6: Media Upload Test
 * Tests file upload functionality with temporary files
 */
export const mediaUploadTestExample = () => `
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

describe('Media Upload Examples', () => {
  let mediaService: WordPressMediaService;
  let tempDir: string;
  let testImagePath: string;

  beforeEach(async () => {
    mediaService = new WordPressMediaService(mockHttpClient);
    
    // Create temporary test file
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'test-'));
    testImagePath = path.join(tempDir, 'test.png');
    await fs.writeFile(testImagePath, Buffer.from('fake-image-data'));
  });

  afterEach(async () => {
    if (tempDir) {
      await fs.remove(tempDir);
    }
  });

  it('should upload media file successfully', async () => {
    const input = {
      file_path: testImagePath,
      title: 'Test Image',
      alt_text: 'Test alt text'
    };

    const mockMedia = WordPressMockData.createMedia({
      id: 456,
      title: { rendered: 'Test Image' }
    });

    httpClient.post.mockResolvedValue({ data: mockMedia });

    const result = await mediaService.uploadMedia(input);

    expect(isValidMCPResponse(result)).toBe(true);
    expect(result.content[0].text).toContain('Successfully uploaded');
  });

  it('should handle file not found error', async () => {
    const input = {
      file_path: '/non/existent/file.jpg'
    };

    const result = await mediaService.uploadMedia(input);

    expect(isValidMCPErrorResponse(result)).toBe(true);
    expect(result.code).toBe('file_not_found');
  });
});
`;

/**
 * Example 7: Custom Test Utilities
 * Shows how to create and use custom test helpers
 */
export const customTestUtilitiesExample = () => `
// Custom test utilities example

export const createMockPostWithCategories = (categories: number[]) => {
  return WordPressMockData.createPost({
    id: Math.floor(Math.random() * 1000),
    categories,
    title: { rendered: 'Test Post with Categories' }
  });
};

export const expectSuccessfulMCPResponse = (result: any, expectedText?: string) => {
  expect(isValidMCPResponse(result)).toBe(true);
  expect(result.isError).toBeUndefined();
  if (expectedText) {
    expect(result.content[0].text).toContain(expectedText);
  }
};

export const expectMCPError = (result: any, expectedCode: string, expectedText?: string) => {
  expect(isValidMCPErrorResponse(result)).toBe(true);
  expect(result.code).toBe(expectedCode);
  if (expectedText) {
    expect(result.content[0].text).toContain(expectedText);
  }
};

// Usage in tests:
describe('Using Custom Utilities', () => {
  it('should use custom helpers', async () => {
    const result = await postsService.createPost(validInput);
    expectSuccessfulMCPResponse(result, 'Successfully created');
  });

  it('should handle errors with custom helper', async () => {
    const result = await postsService.createPost(invalidInput);
    expectMCPError(result, 'validation_error', 'Invalid input');
  });
});
`;

/**
 * Example 8: Async Testing Patterns
 * Shows proper patterns for testing asynchronous operations
 */
export const asyncTestingPatternsExample = () => `
describe('Async Testing Patterns', () => {
  // ✅ Good: Using async/await
  it('should handle async operations properly', async () => {
    const result = await service.asyncOperation();
    expect(result).toBeDefined();
  });

  // ✅ Good: Testing promise rejection
  it('should handle async errors', async () => {
    await expect(service.failingOperation())
      .rejects.toThrow('Expected error message');
  });

  // ✅ Good: Testing multiple async operations
  it('should handle multiple async operations', async () => {
    const [result1, result2] = await Promise.all([
      service.operation1(),
      service.operation2()
    ]);
    
    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
  });

  // ✅ Good: Testing with custom timeout
  it('should complete within timeout', async () => {
    const startTime = Date.now();
    
    await service.slowOperation();
    
    const duration = Date.now() - startTime;
    expect(duration).toBeLessThan(5000);
  }, 10000); // 10 second timeout for this test

  // ✅ Good: Testing promise resolution/rejection states
  it('should test promise states', async () => {
    const promise = service.asyncOperation();
    
    // Test that it's a promise
    expect(promise).toBeInstanceOf(Promise);
    
    // Wait for resolution
    const result = await promise;
    expect(result.success).toBe(true);
  });
});
`;

/**
 * Example 9: Mock Management
 * Shows best practices for managing mocks
 */
export const mockManagementExample = () => `
describe('Mock Management Examples', () => {
  let mockAPI: WordPressAPIMock;
  let httpClient: jest.Mocked<AxiosInstance>;

  beforeEach(() => {
    // Create fresh mocks for each test
    mockAPI = new WordPressAPIMock();
    httpClient = {
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn()
    } as any;
  });

  afterEach(() => {
    // Clean up mocks after each test
    jest.clearAllMocks();
    nock.cleanAll();
  });

  it('should mock specific API responses', async () => {
    // Setup specific mock responses
    mockAPI
      .mockAuthSuccess()
      .mockCreatePost({ id: 123 })
      .mockGetPost(123, { title: { rendered: 'Test Post' } });

    // Your test logic here...
  });

  it('should mock error responses', async () => {
    // Mock specific error conditions
    mockAPI.mockCreatePostFailure({
      code: 'rest_cannot_create',
      message: 'Permission denied',
      data: { status: 403 }
    });

    // Test error handling...
  });

  it('should use implementation-specific mocks', () => {
    // Mock with custom implementation
    httpClient.post.mockImplementation(async (url, data) => {
      if (url.includes('/posts')) {
        return { data: { id: 123, ...data } };
      }
      throw new Error('Unexpected URL');
    });

    // Test with custom mock behavior...
  });

  it('should verify mock calls', async () => {
    await service.createPost({ title: 'Test', content: 'Content' });

    // Verify mock was called correctly
    expect(httpClient.post).toHaveBeenCalledTimes(1);
    expect(httpClient.post).toHaveBeenCalledWith(
      '/wp-json/wp/v2/posts',
      expect.objectContaining({
        title: 'Test',
        content: 'Content'
      })
    );
  });
});
`;

/**
 * Example 10: Test Data Management
 * Shows how to organize and manage test data
 */
export const testDataManagementExample = () => `
// Test data fixtures
const TEST_FIXTURES = {
  posts: {
    valid: {
      title: 'Valid Test Post',
      content: '<p>This is valid content</p>',
      status: 'draft' as const,
      type: 'post' as const
    },
    withCategories: {
      title: 'Post with Categories',
      content: '<p>Content</p>',
      categories: [1, 2, 3]
    },
    complex: {
      title: 'Complex Post',
      content: '<p>Complex content</p>'.repeat(100),
      meta: {
        custom_field_1: 'value1',
        custom_field_2: 42,
        nested_object: { key: 'value' }
      }
    }
  },
  users: {
    admin: {
      id: 1,
      name: 'Admin User',
      roles: ['administrator']
    },
    editor: {
      id: 2,
      name: 'Editor User',
      roles: ['editor']
    }
  }
};

describe('Test Data Management', () => {
  it('should use predefined test fixtures', async () => {
    const mockPost = WordPressMockData.createPost(TEST_FIXTURES.posts.valid);
    httpClient.post.mockResolvedValue({ data: mockPost });

    const result = await postsService.createPost(TEST_FIXTURES.posts.valid);
    expect(isValidMCPResponse(result)).toBe(true);
  });

  it('should generate dynamic test data', async () => {
    const testPosts = Array.from({ length: 5 }, (_, i) => ({
      ...TEST_FIXTURES.posts.valid,
      title: \`Dynamic Post \${i + 1}\`,
      id: i + 1
    }));

    // Use generated test data...
  });
});
`;

// Export all examples for documentation
export const ALL_EXAMPLES = {
  basicUnitTest: basicUnitTestExample(),
  integrationTest: integrationTestExample(),
  errorHandling: errorHandlingTestExample(),
  performanceTest: performanceTestExample(),
  schemaValidation: schemaValidationTestExample(),
  mediaUpload: mediaUploadTestExample(),
  customUtilities: customTestUtilitiesExample(),
  asyncPatterns: asyncTestingPatternsExample(),
  mockManagement: mockManagementExample(),
  testDataManagement: testDataManagementExample()
};