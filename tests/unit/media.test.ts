/**
 * Media upload and management tests
 */

import { WordPressMediaService } from '../../src/services/media.js';
import { ToolInputs } from '../../src/types.js';
import { 
  WordPressAPIMock, 
  createTestEnvironment,
  WordPressMockData,
  WORDPRESS_ERRORS,
  isValidMCPResponse,
  isValidMCPErrorResponse,
  createMockImageFile,
  createMockFile
} from '../utils/test-helpers.js';
import { AxiosInstance } from 'axios';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import nock from 'nock';

describe('WordPressMediaService', () => {
  let mediaService: WordPressMediaService;
  let mockAPI: WordPressAPIMock;
  let httpClient: AxiosInstance;
  let cleanup: () => void;
  let tempDir: string;
  let testImagePath: string;
  let testLargeFilePath: string;

  beforeEach(async () => {
    const testEnv = createTestEnvironment();
    cleanup = testEnv.cleanup;
    
    // Create a simple axios instance for testing
    httpClient = {
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn(),
    } as any;
    
    mediaService = new WordPressMediaService(httpClient);
    mockAPI = new WordPressAPIMock();

    // Create temporary directory and test files
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wp-media-test-'));
    
    // Create a small test image file
    testImagePath = path.join(tempDir, 'test-image.png');
    await fs.writeFile(testImagePath, createMockImageFile());
    
    // Create a large test file (for size limit testing)
    testLargeFilePath = path.join(tempDir, 'large-file.jpg');
    await fs.writeFile(testLargeFilePath, createMockFile('large-file.jpg', 60 * 1024 * 1024, 'image/jpeg')); // 60MB
  });

  afterEach(async () => {
    cleanup();
    nock.cleanAll();
    jest.clearAllMocks();
    
    // Clean up temporary files
    if (tempDir) {
      await fs.remove(tempDir);
    }
  });

  describe('uploadMedia', () => {
    const validUploadInput: ToolInputs['wordpress_upload_media'] = {
      file_path: '', // Will be set in each test
      title: 'Test Image',
      alt_text: 'Test image alt text',
      caption: 'Test image caption',
      description: 'Test image description',
      post_id: 123
    };

    it('should upload media file successfully', async () => {
      const input = { ...validUploadInput, file_path: testImagePath };
      
      const mockMedia = WordPressMockData.createMedia({
        id: 456,
        title: { rendered: 'Test Image' },
        source_url: 'https://example.com/wp-content/uploads/test-image.png',
        mime_type: 'image/png',
        date: '2024-01-01T12:00:00'
      });

      (httpClient.post as jest.Mock).mockResolvedValue({
        data: mockMedia
      });

      const result = await mediaService.uploadMedia(input);

      expect(httpClient.post).toHaveBeenCalledWith(
        '/wp-json/wp/v2/media',
        expect.any(Object), // FormData object
        expect.objectContaining({
          headers: expect.objectContaining({
            'content-type': expect.stringContaining('multipart/form-data')
          }),
          timeout: 60000
        })
      );

      expect(isValidMCPResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('Successfully uploaded media file: Test Image');
      expect(result.content[0].text).toContain('Media ID: 456');
      expect(result.content[0].text).toContain('File URL: https://example.com/wp-content/uploads/test-image.png');
      expect(result.content[0].text).toContain('MIME Type: image/png');
      expect(result.content[0].text).toContain('Attached to Post ID: 123');
    });

    it('should upload media without optional fields', async () => {
      const minimalInput = {
        file_path: testImagePath
      };

      const mockMedia = WordPressMockData.createMedia({
        id: 457,
        title: { rendered: 'test-image.png' }
      });

      (httpClient.post as jest.Mock).mockResolvedValue({
        data: mockMedia
      });

      const result = await mediaService.uploadMedia(minimalInput);

      expect(isValidMCPResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('Not attached to any post');
    });

    it('should handle file not found error', async () => {
      const input = {
        file_path: '/non/existent/file.jpg'
      };

      const result = await mediaService.uploadMedia(input);

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('File not found');
      expect(result.code).toBe('file_not_found');
    });

    it('should handle directory instead of file error', async () => {
      const input = {
        file_path: tempDir // Directory instead of file
      };

      const result = await mediaService.uploadMedia(input);

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('Path is not a file');
      expect(result.code).toBe('invalid_file_path');
    });

    it('should handle file too large error', async () => {
      const input = {
        file_path: testLargeFilePath
      };

      const result = await mediaService.uploadMedia(input);

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('File too large');
      expect(result.content[0].text).toContain('60MB');
      expect(result.code).toBe('file_too_large');
    });

    it('should handle validation errors', async () => {
      const invalidInput = {
        file_path: '', // Empty file path
        title: 'Test'
      };

      const result = await mediaService.uploadMedia(invalidInput);

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.code).toBe('validation_error');
    });

    it('should handle WordPress API upload errors', async () => {
      const input = { ...validUploadInput, file_path: testImagePath };

      (httpClient.post as jest.Mock).mockRejectedValue(
        new Error('Upload failed')
      );

      const result = await mediaService.uploadMedia(input);

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('Upload failed');
    });

    it('should handle unsupported media type error', async () => {
      const input = { ...validUploadInput, file_path: testImagePath };

      const unsupportedTypeError = new Error('Unsupported media type');
      unsupportedTypeError.response = { status: 415 };
      (httpClient.post as jest.Mock).mockRejectedValue(unsupportedTypeError);

      const result = await mediaService.uploadMedia(input);

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('Unsupported media type. Check WordPress allowed file types.');
      expect(result.code).toBe('unsupported_media_type');
    });

    it('should handle file too large server error', async () => {
      const input = { ...validUploadInput, file_path: testImagePath };

      const fileTooLargeError = new Error('Payload too large');
      fileTooLargeError.response = { status: 413 };
      (httpClient.post as jest.Mock).mockRejectedValue(fileTooLargeError);

      const result = await mediaService.uploadMedia(input);

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('File too large. Reduce file size and try again.');
      expect(result.code).toBe('file_too_large');
    });
  });

  describe('getMedia', () => {
    it('should get single media item by ID', async () => {
      const mockMedia = WordPressMockData.createMedia({
        id: 123,
        title: { rendered: 'Test Media' },
        media_type: 'image',
        mime_type: 'image/jpeg',
        source_url: 'https://example.com/test.jpg',
        description: { rendered: '<p>Test description</p>' },
        caption: { rendered: '<p>Test caption</p>' },
        alt_text: 'Test alt text',
        media_details: {
          width: 1920,
          height: 1080,
          file: '2024/01/test.jpg',
          filesize: 256000,
          sizes: {
            thumbnail: {
              file: 'test-150x150.jpg',
              width: 150,
              height: 150,
              mime_type: 'image/jpeg',
              source_url: 'https://example.com/test-150x150.jpg'
            },
            medium: {
              file: 'test-300x169.jpg',
              width: 300,
              height: 169,
              mime_type: 'image/jpeg',
              source_url: 'https://example.com/test-300x169.jpg'
            }
          }
        },
        post: 456
      });

      (httpClient.get as jest.Mock).mockResolvedValue({
        data: mockMedia
      });

      const result = await mediaService.getMedia({ id: 123 });

      expect(httpClient.get).toHaveBeenCalledWith('/wp-json/wp/v2/media/123', {
        params: { per_page: 10, page: 1 }
      });

      expect(isValidMCPResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('Media ID: 123');
      expect(result.content[0].text).toContain('Title: Test Media');
      expect(result.content[0].text).toContain('Dimensions: 1920 × 1080 pixels');
      expect(result.content[0].text).toContain('File Size: 250KB');
      expect(result.content[0].text).toContain('Alt Text: Test alt text');
      expect(result.content[0].text).toContain('Available Sizes:');
      expect(result.content[0].text).toContain('thumbnail: 150 × 150');
      expect(result.content[0].text).toContain('Attached to Post ID: 456');
    });

    it('should list multiple media items', async () => {
      const mockMediaList = [
        WordPressMockData.createMedia({ id: 1, title: { rendered: 'Media 1' } }),
        WordPressMockData.createMedia({ id: 2, title: { rendered: 'Media 2' } }),
        WordPressMockData.createMedia({ id: 3, title: { rendered: 'Media 3' } })
      ];

      (httpClient.get as jest.Mock).mockResolvedValue({
        data: mockMediaList,
        headers: {
          'x-wp-total': '3',
          'x-wp-totalpages': '1'
        }
      });

      const result = await mediaService.getMedia({});

      expect(httpClient.get).toHaveBeenCalledWith('/wp-json/wp/v2/media', {
        params: { per_page: 10, page: 1 }
      });

      expect(isValidMCPResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('Found 3 media items');
      expect(result.content[0].text).toContain('Media 1');
      expect(result.content[0].text).toContain('Media 2');
      expect(result.content[0].text).toContain('Media 3');
    });

    it('should search media with filters', async () => {
      const searchInput: ToolInputs['wordpress_get_media'] = {
        search: 'image',
        mime_type: 'image/jpeg',
        per_page: 5,
        page: 2
      };

      const mockSearchResults = [
        WordPressMockData.createMedia({ id: 6, title: { rendered: 'Image 6' } })
      ];

      (httpClient.get as jest.Mock).mockResolvedValue({
        data: mockSearchResults,
        headers: {
          'x-wp-total': '6',
          'x-wp-totalpages': '2'
        }
      });

      const result = await mediaService.getMedia(searchInput);

      expect(httpClient.get).toHaveBeenCalledWith('/wp-json/wp/v2/media', {
        params: {
          per_page: 5,
          page: 2,
          search: 'image',
          mime_type: 'image/jpeg'
        }
      });

      expect(isValidMCPResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('Found 1 media items (Page 2 of 2, 6 total)');
    });

    it('should handle media not found', async () => {
      (httpClient.get as jest.Mock).mockResolvedValue({
        data: [] // No media found
      });

      const result = await mediaService.getMedia({ search: 'nonexistent' });

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('No media found matching the specified criteria.');
      expect(result.code).toBe('media_not_found');
    });

    it('should handle media ID not found', async () => {
      (httpClient.get as jest.Mock).mockResolvedValue({
        data: []
      });

      const result = await mediaService.getMedia({ id: 999 });

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('No media found with ID 999');
      expect(result.code).toBe('media_not_found');
    });
  });

  describe('deleteMedia', () => {
    it('should move media to trash by default', async () => {
      const mockMedia = WordPressMockData.createMedia({
        id: 123,
        title: { rendered: 'Deleted Media' }
      });

      (httpClient.delete as jest.Mock).mockResolvedValue({
        data: mockMedia
      });

      const result = await mediaService.deleteMedia(123, false);

      expect(httpClient.delete).toHaveBeenCalledWith('/wp-json/wp/v2/media/123', {
        params: {}
      });

      expect(isValidMCPResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('moved to trash');
    });

    it('should permanently delete when force is true', async () => {
      (httpClient.delete as jest.Mock).mockResolvedValue({
        data: { deleted: true }
      });

      const result = await mediaService.deleteMedia(123, true);

      expect(httpClient.delete).toHaveBeenCalledWith('/wp-json/wp/v2/media/123', {
        params: { force: 'true' }
      });

      expect(isValidMCPResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('permanently deleted');
    });

    it('should handle invalid media ID', async () => {
      const result = await mediaService.deleteMedia(0);

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('Invalid media ID');
      expect(result.code).toBe('invalid_media_id');
    });

    it('should handle negative media ID', async () => {
      const result = await mediaService.deleteMedia(-1);

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toContain('Invalid media ID');
      expect(result.code).toBe('invalid_media_id');
    });

    it('should handle delete errors', async () => {
      (httpClient.delete as jest.Mock).mockRejectedValue(
        new Error('Delete failed')
      );

      const result = await mediaService.deleteMedia(123);

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('Delete failed');
    });
  });

  describe('error handling', () => {
    it('should handle file system permission errors', async () => {
      const input = { file_path: testImagePath };

      // Mock fs.pathExists to throw permission error
      jest.spyOn(fs, 'pathExists').mockRejectedValue(
        Object.assign(new Error('Permission denied'), { code: 'EACCES' })
      );

      const result = await mediaService.uploadMedia(input);

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('Permission denied. Check file permissions.');
      expect(result.code).toBe('permission_error');

      // Restore original implementation
      jest.restoreAllMocks();
    });

    it('should handle too many open files error', async () => {
      const input = { file_path: testImagePath };

      jest.spyOn(fs, 'pathExists').mockRejectedValue(
        Object.assign(new Error('Too many open files'), { code: 'EMFILE' })
      );

      const result = await mediaService.uploadMedia(input);

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('Too many open files. Try again later.');
      expect(result.code).toBe('system_error');

      jest.restoreAllMocks();
    });

    it('should handle network errors during upload', async () => {
      const input = { file_path: testImagePath };

      const networkError = new Error('Network error');
      networkError.code = 'ENOTFOUND';
      (httpClient.post as jest.Mock).mockRejectedValue(networkError);

      const result = await mediaService.uploadMedia(input);

      expect(isValidMCPErrorResponse(result)).toBe(true);
      expect(result.content[0].text).toBe('Cannot connect to WordPress site. Check the site URL.');
      expect(result.code).toBe('connection_error');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete media workflow', async () => {
      const uploadInput = {
        file_path: testImagePath,
        title: 'Workflow Test Image',
        alt_text: 'Workflow test alt',
        post_id: 789
      };

      // Mock upload
      const uploadedMedia = WordPressMockData.createMedia({
        id: 100,
        title: { rendered: 'Workflow Test Image' },
        alt_text: 'Workflow test alt',
        post: 789
      });

      (httpClient.post as jest.Mock).mockResolvedValue({
        data: uploadedMedia
      });

      const uploadResult = await mediaService.uploadMedia(uploadInput);
      expect(isValidMCPResponse(uploadResult)).toBe(true);

      // Mock get uploaded media
      (httpClient.get as jest.Mock).mockResolvedValue({
        data: uploadedMedia
      });

      const getResult = await mediaService.getMedia({ id: 100 });
      expect(isValidMCPResponse(getResult)).toBe(true);
      expect(getResult.content[0].text).toContain('Workflow Test Image');

      // Mock delete media
      (httpClient.delete as jest.Mock).mockResolvedValue({
        data: { ...uploadedMedia, status: 'trash' }
      });

      const deleteResult = await mediaService.deleteMedia(100);
      expect(isValidMCPResponse(deleteResult)).toBe(true);
      expect(deleteResult.content[0].text).toContain('moved to trash');
    });

    it('should handle concurrent media uploads', async () => {
      const uploads = Array.from({ length: 3 }, (_, i) => ({
        file_path: testImagePath,
        title: `Concurrent Upload ${i + 1}`
      }));

      // Mock successful uploads
      uploads.forEach((_, i) => {
        (httpClient.post as jest.Mock).mockImplementationOnce(() => 
          Promise.resolve({
            data: WordPressMockData.createMedia({
              id: 200 + i,
              title: { rendered: `Concurrent Upload ${i + 1}` }
            })
          })
        );
      });

      const results = await Promise.all(
        uploads.map(upload => mediaService.uploadMedia(upload))
      );

      results.forEach((result, i) => {
        expect(isValidMCPResponse(result)).toBe(true);
        expect(result.content[0].text).toContain(`Concurrent Upload ${i + 1}`);
      });
    });
  });
});