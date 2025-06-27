import { WordPressPostsService } from '../../src/services/posts.js';
import { ToolInputs } from '../../src/types.js';
import { 
  WordPressAPIMock, 
  createTestEnvironment,
  WordPressMockData,
  WORDPRESS_ERRORS,
  isValidMCPResponse,
  isValidMCPErrorResponse
} from '../utils/test-helpers.js';
import { AxiosInstance } from 'axios';
import nock from 'nock';

describe('WordPressPostsService', () => {
  let postsService: WordPressPostsService;
  let mockAPI: WordPressAPIMock;
  let httpClient: AxiosInstance;
  let cleanup: () => void;

  beforeEach(() => {
    const testEnv = createTestEnvironment();
    cleanup = testEnv.cleanup;
    
    // Create a simple axios instance for testing
    httpClient = {
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn(),
    } as any;
    
    postsService = new WordPressPostsService(httpClient);
    mockAPI = new WordPressAPIMock();
  });

  afterEach(() => {
    cleanup();
    nock.cleanAll();
    jest.clearAllMocks();
  });

  describe('createPost', () => {
    const validCreateInput: ToolInputs['wordpress_create_post'] = {
      title: 'Test Post',
      content: '<p>This is test content</p>',
      status: 'draft',
      type: 'post'
    };

    it('should create a post successfully', async () => {
      const mockPost = WordPressMockData.createPost({
        id: 123,
        title: { rendered: 'Test Post' },
        status: 'draft',
        link: 'https://example.com/test-post'
      });

      (httpClient.post as jest.Mock).mockResolvedValue({
        data: mockPost
      });

      const result = await postsService.createPost(validCreateInput);

      expect(httpClient.post).toHaveBeenCalledWith('/wp-json/wp/v2/posts', {
        title: 'Test Post',
        content: '<p>This is test content</p>',
        status: 'draft',
        type: 'post'
      });

      expect(isValidMCPResponse(result)).toBe(true);
      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain('Successfully created post "Test Post" with ID 123');
    });

    it('should create a post with all optional fields', async () => {
      const fullInput: ToolInputs['wordpress_create_post'] = {
        title: 'Full Test Post',
        content: '<p>Full test content</p>',
        status: 'publish',
        type: 'page',
        categories: [1, 2],
        tags: ['tag1', 'tag2'],
        featured_media: 456,
        excerpt: 'Test excerpt',
        meta: { custom_field: 'custom_value' }
      };

      const mockPost = WordPressMockData.createPost({
        id: 124,
        title: { rendered: 'Full Test Post' },
        status: 'publish'
      });

      (httpClient.post as jest.Mock).mockResolvedValue({
        data: mockPost
      });

      const result = await postsService.createPost(fullInput);

      expect(httpClient.post).toHaveBeenCalledWith('/wp-json/wp/v2/posts', {
        title: 'Full Test Post',
        content: '<p>Full test content</p>',
        status: 'publish',
        type: 'page',
        categories: [1, 2],
        tags: ['tag1', 'tag2'],
        featured_media: 456,
        excerpt: 'Test excerpt',
        meta: { custom_field: 'custom_value' }
      });

      expect(isValidMCPResponse(result)).toBe(true);
    });

    it('should handle validation errors', async () => {
      const invalidInput = {
        title: '', // Invalid: empty title
        content: 'Test content'
      } as ToolInputs['wordpress_create_post'];

      const result = await postsService.createPost(invalidInput);

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('Invalid input');
      expect(result.code).toBe('validation_error');
    });

    it('should handle WordPress API errors', async () => {
      (httpClient.post as jest.Mock).mockRejectedValue(
        new Error('WordPress API Error')
      );

      const result = await postsService.createPost(validCreateInput);

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('WordPress API Error');
    });

    it('should handle authentication errors', async () => {
      const authError = new Error('Authentication failed');
      authError.response = { status: 401 };
      (httpClient.post as jest.Mock).mockRejectedValue(authError);

      const result = await postsService.createPost(validCreateInput);

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('Authentication failed. Check your credentials.');
      expect(result.code).toBe('auth_error');
    });

    it('should handle permission errors', async () => {
      const permError = new Error('Permission denied');
      permError.response = { status: 403 };
      (httpClient.post as jest.Mock).mockRejectedValue(permError);

      const result = await postsService.createPost(validCreateInput);

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('Permission denied. Check user permissions.');
      expect(result.code).toBe('permission_error');
    });
  });

  describe('readPost', () => {
    it('should read a post by ID', async () => {
      const mockPost = WordPressMockData.createPost({
        id: 123,
        title: { rendered: 'Test Post' },
        content: { rendered: '<p>Test content</p>' },
        status: 'publish',
        type: 'post',
        link: 'https://example.com/test-post',
        date: '2024-01-01T12:00:00',
        modified: '2024-01-02T12:00:00'
      });

      (httpClient.get as jest.Mock).mockResolvedValue({
        data: mockPost
      });

      const result = await postsService.readPost({ id: 123 });

      expect(httpClient.get).toHaveBeenCalledWith('/wp-json/wp/v2/posts/123', {
        params: { context: 'view' }
      });

      expect(isValidMCPResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('ID: 123');
      expect(result.content[0].text).toContain('Title: Test Post');
      expect(result.content[0].text).toContain('Status: publish');
      expect(result.content[0].text).toContain('<p>Test content</p>');
    });

    it('should read a post by slug', async () => {
      const mockPost = WordPressMockData.createPost({
        id: 124,
        slug: 'test-post-slug'
      });

      (httpClient.get as jest.Mock).mockResolvedValue({
        data: [mockPost] // API returns array when searching by slug
      });

      const result = await postsService.readPost({ slug: 'test-post-slug' });

      expect(httpClient.get).toHaveBeenCalledWith('/wp-json/wp/v2/posts', {
        params: { context: 'view', slug: 'test-post-slug' }
      });

      expect(isValidMCPResponse(result)).toBe(true);
    });

    it('should include meta fields when requested', async () => {
      const mockPost = WordPressMockData.createPost({
        id: 125,
        meta: { custom_field: 'custom_value', another_field: 123 }
      });

      (httpClient.get as jest.Mock).mockResolvedValue({
        data: mockPost
      });

      const result = await postsService.readPost({ id: 125, include_meta: true });

      expect(httpClient.get).toHaveBeenCalledWith('/wp-json/wp/v2/posts/125', {
        params: { 
          context: 'view',
          _fields: 'id,title,content,status,type,categories,tags,featured_media,excerpt,meta,link,date,modified'
        }
      });

      expect(isValidMCPResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('Meta fields:');
      expect(result.content[0].text).toContain('custom_field: "custom_value"');
    });

    it('should handle post not found', async () => {
      (httpClient.get as jest.Mock).mockResolvedValue({
        data: [] // Empty array means no posts found
      });

      const result = await postsService.readPost({ id: 999 });

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('No post found with ID 999');
      expect(result.code).toBe('post_not_found');
    });

    it('should validate input parameters', async () => {
      const result = await postsService.readPost({} as any);

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('Invalid input');
      expect(result.code).toBe('validation_error');
    });
  });

  describe('updatePost', () => {
    const validUpdateInput: ToolInputs['wordpress_update_post'] = {
      id: 123,
      title: 'Updated Post Title',
      content: '<p>Updated content</p>'
    };

    it('should update a post successfully', async () => {
      const mockPost = WordPressMockData.createPost({
        id: 123,
        title: { rendered: 'Updated Post Title' },
        status: 'publish',
        link: 'https://example.com/updated-post'
      });

      (httpClient.post as jest.Mock).mockResolvedValue({
        data: mockPost
      });

      const result = await postsService.updatePost(validUpdateInput);

      expect(httpClient.post).toHaveBeenCalledWith('/wp-json/wp/v2/posts/123', {
        title: 'Updated Post Title',
        content: '<p>Updated content</p>'
      });

      expect(isValidMCPResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('Successfully updated post "Updated Post Title"');
    });

    it('should only include provided fields in update', async () => {
      const partialUpdate: ToolInputs['wordpress_update_post'] = {
        id: 123,
        status: 'publish'
      };

      const mockPost = WordPressMockData.createPost({ id: 123 });
      (httpClient.post as jest.Mock).mockResolvedValue({ data: mockPost });

      await postsService.updatePost(partialUpdate);

      expect(httpClient.post).toHaveBeenCalledWith('/wp-json/wp/v2/posts/123', {
        status: 'publish'
      });
    });

    it('should handle validation errors', async () => {
      const invalidInput = {
        // Missing required id field
        title: 'Updated Title'
      } as ToolInputs['wordpress_update_post'];

      const result = await postsService.updatePost(invalidInput);

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.code).toBe('validation_error');
    });
  });

  describe('listPosts', () => {
    it('should list posts with default parameters', async () => {
      const mockPosts = [
        WordPressMockData.createPost({ id: 1, title: { rendered: 'Post 1' } }),
        WordPressMockData.createPost({ id: 2, title: { rendered: 'Post 2' } })
      ];

      (httpClient.get as jest.Mock).mockResolvedValue({
        data: mockPosts,
        headers: {
          'x-wp-total': '2',
          'x-wp-totalpages': '1'
        }
      });

      const result = await postsService.listPosts({});

      expect(httpClient.get).toHaveBeenCalledWith('/wp-json/wp/v2/posts', {
        params: {
          per_page: 10,
          page: 1,
          orderby: 'date',
          order: 'desc'
        }
      });

      expect(isValidMCPResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('Found 2 posts');
      expect(result.content[0].text).toContain('Post 1');
      expect(result.content[0].text).toContain('Post 2');
    });

    it('should list posts with filters', async () => {
      const mockPosts = [WordPressMockData.createPost({ id: 1 })];

      (httpClient.get as jest.Mock).mockResolvedValue({
        data: mockPosts,
        headers: { 'x-wp-total': '1', 'x-wp-totalpages': '1' }
      });

      const input: ToolInputs['wordpress_list_posts'] = {
        per_page: 5,
        page: 2,
        search: 'test',
        author: 1,
        categories: [1, 2],
        tags: [3, 4],
        status: 'publish',
        orderby: 'title',
        order: 'asc'
      };

      await postsService.listPosts(input);

      expect(httpClient.get).toHaveBeenCalledWith('/wp-json/wp/v2/posts', {
        params: {
          per_page: 5,
          page: 2,
          search: 'test',
          author: 1,
          categories: '1,2',
          tags: '3,4',
          status: 'publish',
          orderby: 'title',
          order: 'asc'
        }
      });
    });

    it('should handle empty results', async () => {
      (httpClient.get as jest.Mock).mockResolvedValue({
        data: [],
        headers: {}
      });

      const result = await postsService.listPosts({});

      expect(isValidMCPResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('No posts found matching the specified criteria.');
    });
  });

  describe('deletePost', () => {
    it('should move post to trash by default', async () => {
      const mockPost = WordPressMockData.createPost({
        id: 123,
        title: { rendered: 'Deleted Post' },
        status: 'trash'
      });

      (httpClient.delete as jest.Mock).mockResolvedValue({
        data: mockPost
      });

      const result = await postsService.deletePost({ id: 123 });

      expect(httpClient.delete).toHaveBeenCalledWith('/wp-json/wp/v2/posts/123', {
        params: {}
      });

      expect(isValidMCPResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('moved to trash');
    });

    it('should permanently delete when force is true', async () => {
      (httpClient.delete as jest.Mock).mockResolvedValue({
        data: { deleted: true }
      });

      const result = await postsService.deletePost({ id: 123, force: true });

      expect(httpClient.delete).toHaveBeenCalledWith('/wp-json/wp/v2/posts/123', {
        params: { force: 'true' }
      });

      expect(isValidMCPResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('permanently deleted');
    });

    it('should handle validation errors', async () => {
      const result = await postsService.deletePost({} as any);

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.code).toBe('validation_error');
    });
  });

  describe('error handling', () => {
    it('should handle network connection errors', async () => {
      const networkError = new Error('Network Error');
      networkError.code = 'ENOTFOUND';
      (httpClient.get as jest.Mock).mockRejectedValue(networkError);

      const result = await postsService.readPost({ id: 123 });

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('Cannot connect to WordPress site. Check the site URL.');
      expect(result.code).toBe('connection_error');
    });

    it('should handle connection refused errors', async () => {
      const connError = new Error('Connection refused');
      connError.code = 'ECONNREFUSED';
      (httpClient.get as jest.Mock).mockRejectedValue(connError);

      const result = await postsService.readPost({ id: 123 });

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('Connection refused. WordPress site may be down.');
      expect(result.code).toBe('connection_error');
    });

    it('should handle 404 errors', async () => {
      const notFoundError = new Error('Not Found');
      notFoundError.response = { status: 404 };
      (httpClient.get as jest.Mock).mockRejectedValue(notFoundError);

      const result = await postsService.readPost({ id: 123 });

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('Resource not found.');
      expect(result.code).toBe('not_found');
    });

    it('should handle rate limit errors', async () => {
      const rateLimitError = new Error('Rate limited');
      rateLimitError.response = { status: 429 };
      (httpClient.get as jest.Mock).mockRejectedValue(rateLimitError);

      const result = await postsService.readPost({ id: 123 });

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('Rate limit exceeded. Please try again later.');
      expect(result.code).toBe('rate_limit');
    });

    it('should handle unknown errors gracefully', async () => {
      const unknownError = new Error('Something went wrong');
      (httpClient.get as jest.Mock).mockRejectedValue(unknownError);

      const result = await postsService.readPost({ id: 123 });

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('Something went wrong');
      expect(result.code).toBe('unknown_error');
    });
  });
});