/**
 * Schema validation tests using Zod schemas
 * Tests ensure all MCP tool inputs are properly validated
 */

import {
  WordPressConfigSchema,
  CreatePostSchema,
  ReadPostSchema,
  UpdatePostSchema,
  ListPostsSchema,
  DeletePostSchema,
  UploadMediaSchema,
  GetMediaSchema,
  ManageCategoriesSchema,
  ManageTagsSchema
} from '../../src/types.js';
import { ZodError } from 'zod';

describe('Schema Validation Tests', () => {
  
  describe('WordPressConfigSchema', () => {
    it('should validate valid WordPress configuration', () => {
      const validConfig = {
        site_url: 'https://example.com',
        username: 'testuser',
        app_password: 'test password 123',
        verify_ssl: true,
        timeout: 30000,
        rate_limit: {
          requests_per_minute: 60,
          burst_limit: 10
        }
      };

      const result = WordPressConfigSchema.parse(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should apply default values for optional fields', () => {
      const minimalConfig = {
        site_url: 'https://example.com',
        username: 'testuser',
        app_password: 'test password 123'
      };

      const result = WordPressConfigSchema.parse(minimalConfig);
      expect(result.verify_ssl).toBe(true);
      expect(result.timeout).toBe(30000);
    });

    it('should reject invalid site URLs', () => {
      const invalidConfig = {
        site_url: 'not-a-url',
        username: 'testuser',
        app_password: 'test password 123'
      };

      expect(() => WordPressConfigSchema.parse(invalidConfig)).toThrow(ZodError);
    });

    it('should reject empty username', () => {
      const invalidConfig = {
        site_url: 'https://example.com',
        username: '',
        app_password: 'test password 123'
      };

      expect(() => WordPressConfigSchema.parse(invalidConfig)).toThrow(ZodError);
    });

    it('should reject empty app_password', () => {
      const invalidConfig = {
        site_url: 'https://example.com',
        username: 'testuser',
        app_password: ''
      };

      expect(() => WordPressConfigSchema.parse(invalidConfig)).toThrow(ZodError);
    });

    it('should reject timeout less than 1000ms', () => {
      const invalidConfig = {
        site_url: 'https://example.com',
        username: 'testuser',
        app_password: 'test password 123',
        timeout: 500
      };

      expect(() => WordPressConfigSchema.parse(invalidConfig)).toThrow(ZodError);
    });
  });

  describe('CreatePostSchema', () => {
    it('should validate valid post creation input', () => {
      const validInput = {
        title: 'Test Post',
        content: '<p>Test content</p>',
        status: 'draft' as const,
        type: 'post' as const,
        categories: [1, 2],
        tags: ['tag1', 'tag2'],
        featured_media: 123,
        excerpt: 'Test excerpt',
        meta: { custom_field: 'value' }
      };

      const result = CreatePostSchema.parse(validInput);
      expect(result).toEqual(validInput);
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

    it('should reject empty title', () => {
      const invalidInput = {
        title: '',
        content: 'Test content'
      };

      expect(() => CreatePostSchema.parse(invalidInput)).toThrow(ZodError);
    });

    it('should reject invalid status', () => {
      const invalidInput = {
        title: 'Test Post',
        content: 'Test content',
        status: 'invalid-status'
      };

      expect(() => CreatePostSchema.parse(invalidInput)).toThrow(ZodError);
    });

    it('should reject invalid type', () => {
      const invalidInput = {
        title: 'Test Post',
        content: 'Test content',
        type: 'invalid-type'
      };

      expect(() => CreatePostSchema.parse(invalidInput)).toThrow(ZodError);
    });

    it('should validate optional arrays', () => {
      const inputWithArrays = {
        title: 'Test Post',
        content: 'Test content',
        categories: [1, 2, 3],
        tags: ['tag1', 'tag2']
      };

      const result = CreatePostSchema.parse(inputWithArrays);
      expect(result.categories).toEqual([1, 2, 3]);
      expect(result.tags).toEqual(['tag1', 'tag2']);
    });
  });

  describe('ReadPostSchema', () => {
    it('should validate input with ID', () => {
      const validInput = {
        id: 123,
        include_meta: true,
        context: 'edit' as const
      };

      const result = ReadPostSchema.parse(validInput);
      expect(result).toEqual(validInput);
    });

    it('should validate input with slug', () => {
      const validInput = {
        slug: 'test-post',
        include_meta: false,
        context: 'view' as const
      };

      const result = ReadPostSchema.parse(validInput);
      expect(result).toEqual(validInput);
    });

    it('should apply default values', () => {
      const minimalInput = {
        id: 123
      };

      const result = ReadPostSchema.parse(minimalInput);
      expect(result.include_meta).toBe(false);
      expect(result.context).toBe('view');
    });

    it('should reject input without id or slug', () => {
      const invalidInput = {
        include_meta: true
      };

      expect(() => ReadPostSchema.parse(invalidInput)).toThrow(ZodError);
    });

    it('should reject invalid context', () => {
      const invalidInput = {
        id: 123,
        context: 'invalid-context'
      };

      expect(() => ReadPostSchema.parse(invalidInput)).toThrow(ZodError);
    });
  });

  describe('UpdatePostSchema', () => {
    it('should validate valid update input', () => {
      const validInput = {
        id: 123,
        title: 'Updated Title',
        content: 'Updated content',
        status: 'publish' as const,
        categories: [1, 2],
        tags: ['updated-tag'],
        featured_media: 456,
        excerpt: 'Updated excerpt',
        meta: { updated_field: 'value' }
      };

      const result = UpdatePostSchema.parse(validInput);
      expect(result).toEqual(validInput);
    });

    it('should validate minimal update input', () => {
      const minimalInput = {
        id: 123,
        title: 'New Title'
      };

      const result = UpdatePostSchema.parse(minimalInput);
      expect(result).toEqual(minimalInput);
    });

    it('should reject input without id', () => {
      const invalidInput = {
        title: 'Updated Title'
      };

      expect(() => UpdatePostSchema.parse(invalidInput)).toThrow(ZodError);
    });

    it('should reject id less than 1', () => {
      const invalidInput = {
        id: 0,
        title: 'Updated Title'
      };

      expect(() => UpdatePostSchema.parse(invalidInput)).toThrow(ZodError);
    });
  });

  describe('ListPostsSchema', () => {
    it('should validate complete list input', () => {
      const validInput = {
        per_page: 20,
        page: 2,
        search: 'test',
        author: 1,
        categories: [1, 2],
        tags: [3, 4],
        status: 'publish',
        orderby: 'title' as const,
        order: 'asc' as const,
        before: '2024-01-01T00:00:00',
        after: '2023-01-01T00:00:00'
      };

      const result = ListPostsSchema.parse(validInput);
      expect(result).toEqual(validInput);
    });

    it('should apply default values', () => {
      const emptyInput = {};

      const result = ListPostsSchema.parse(emptyInput);
      expect(result.per_page).toBe(10);
      expect(result.page).toBe(1);
      expect(result.orderby).toBe('date');
      expect(result.order).toBe('desc');
    });

    it('should reject per_page greater than 100', () => {
      const invalidInput = {
        per_page: 150
      };

      expect(() => ListPostsSchema.parse(invalidInput)).toThrow(ZodError);
    });

    it('should reject per_page less than 1', () => {
      const invalidInput = {
        per_page: 0
      };

      expect(() => ListPostsSchema.parse(invalidInput)).toThrow(ZodError);
    });

    it('should reject page less than 1', () => {
      const invalidInput = {
        page: 0
      };

      expect(() => ListPostsSchema.parse(invalidInput)).toThrow(ZodError);
    });

    it('should reject invalid orderby', () => {
      const invalidInput = {
        orderby: 'invalid-orderby'
      };

      expect(() => ListPostsSchema.parse(invalidInput)).toThrow(ZodError);
    });
  });

  describe('DeletePostSchema', () => {
    it('should validate valid delete input', () => {
      const validInput = {
        id: 123,
        force: true
      };

      const result = DeletePostSchema.parse(validInput);
      expect(result).toEqual(validInput);
    });

    it('should apply default force value', () => {
      const minimalInput = {
        id: 123
      };

      const result = DeletePostSchema.parse(minimalInput);
      expect(result.force).toBe(false);
    });

    it('should reject input without id', () => {
      const invalidInput = {
        force: true
      };

      expect(() => DeletePostSchema.parse(invalidInput)).toThrow(ZodError);
    });

    it('should reject id less than 1', () => {
      const invalidInput = {
        id: -1
      };

      expect(() => DeletePostSchema.parse(invalidInput)).toThrow(ZodError);
    });
  });

  describe('UploadMediaSchema', () => {
    it('should validate valid upload input', () => {
      const validInput = {
        file_path: '/path/to/image.jpg',
        title: 'Test Image',
        alt_text: 'Alternative text',
        caption: 'Image caption',
        description: 'Image description',
        post_id: 123
      };

      const result = UploadMediaSchema.parse(validInput);
      expect(result).toEqual(validInput);
    });

    it('should validate minimal upload input', () => {
      const minimalInput = {
        file_path: '/path/to/image.jpg'
      };

      const result = UploadMediaSchema.parse(minimalInput);
      expect(result).toEqual(minimalInput);
    });

    it('should reject empty file_path', () => {
      const invalidInput = {
        file_path: ''
      };

      expect(() => UploadMediaSchema.parse(invalidInput)).toThrow(ZodError);
    });

    it('should reject input without file_path', () => {
      const invalidInput = {
        title: 'Test Image'
      };

      expect(() => UploadMediaSchema.parse(invalidInput)).toThrow(ZodError);
    });
  });

  describe('GetMediaSchema', () => {
    it('should validate complete media query', () => {
      const validInput = {
        id: 123,
        search: 'image',
        per_page: 20,
        page: 2,
        mime_type: 'image/jpeg'
      };

      const result = GetMediaSchema.parse(validInput);
      expect(result).toEqual(validInput);
    });

    it('should apply default values', () => {
      const emptyInput = {};

      const result = GetMediaSchema.parse(emptyInput);
      expect(result.per_page).toBe(10);
      expect(result.page).toBe(1);
    });

    it('should reject per_page greater than 100', () => {
      const invalidInput = {
        per_page: 150
      };

      expect(() => GetMediaSchema.parse(invalidInput)).toThrow(ZodError);
    });
  });

  describe('ManageCategoriesSchema', () => {
    it('should validate create action', () => {
      const validInput = {
        action: 'create' as const,
        name: 'New Category',
        slug: 'new-category',
        description: 'Category description',
        parent: 0
      };

      const result = ManageCategoriesSchema.parse(validInput);
      expect(result).toEqual(validInput);
    });

    it('should validate read action', () => {
      const validInput = {
        action: 'read' as const,
        id: 123
      };

      const result = ManageCategoriesSchema.parse(validInput);
      expect(result).toEqual(validInput);
    });

    it('should validate list action', () => {
      const validInput = {
        action: 'list' as const
      };

      const result = ManageCategoriesSchema.parse(validInput);
      expect(result).toEqual(validInput);
    });

    it('should reject invalid action', () => {
      const invalidInput = {
        action: 'invalid-action'
      };

      expect(() => ManageCategoriesSchema.parse(invalidInput)).toThrow(ZodError);
    });

    it('should reject input without action', () => {
      const invalidInput = {
        name: 'Test Category'
      };

      expect(() => ManageCategoriesSchema.parse(invalidInput)).toThrow(ZodError);
    });
  });

  describe('ManageTagsSchema', () => {
    it('should validate complete tag management', () => {
      const validInput = {
        action: 'update' as const,
        id: 123,
        name: 'Updated Tag',
        slug: 'updated-tag',
        description: 'Updated description'
      };

      const result = ManageTagsSchema.parse(validInput);
      expect(result).toEqual(validInput);
    });

    it('should validate delete action', () => {
      const validInput = {
        action: 'delete' as const,
        id: 123
      };

      const result = ManageTagsSchema.parse(validInput);
      expect(result).toEqual(validInput);
    });

    it('should reject invalid action', () => {
      const invalidInput = {
        action: 'invalid-action'
      };

      expect(() => ManageTagsSchema.parse(invalidInput)).toThrow(ZodError);
    });
  });

  describe('Edge Cases and Complex Validation', () => {
    it('should handle nested object validation in meta fields', () => {
      const inputWithComplexMeta = {
        title: 'Test Post',
        content: 'Test content',
        meta: {
          simple_string: 'value',
          number_field: 42,
          boolean_field: true,
          array_field: [1, 2, 3],
          nested_object: {
            nested_string: 'nested value',
            nested_number: 123
          }
        }
      };

      const result = CreatePostSchema.parse(inputWithComplexMeta);
      expect(result.meta).toEqual(inputWithComplexMeta.meta);
    });

    it('should handle empty arrays in categories and tags', () => {
      const inputWithEmptyArrays = {
        title: 'Test Post',
        content: 'Test content',
        categories: [],
        tags: []
      };

      const result = CreatePostSchema.parse(inputWithEmptyArrays);
      expect(result.categories).toEqual([]);
      expect(result.tags).toEqual([]);
    });

    it('should validate mixed type arrays in categories', () => {
      const inputWithInvalidCategories = {
        title: 'Test Post',
        content: 'Test content',
        categories: [1, 'invalid', 3] // Contains string in number array
      };

      expect(() => CreatePostSchema.parse(inputWithInvalidCategories)).toThrow(ZodError);
    });

    it('should validate Unicode and special characters in strings', () => {
      const unicodeInput = {
        title: 'Test with émojis 🎉 and spëcial çharacters',
        content: '<p>Content with 中文, العربية, and русский text.</p>',
        tags: ['émoji-tag-🎉', 'spëcial-çhar', '中文标签']
      };

      const result = CreatePostSchema.parse(unicodeInput);
      expect(result.title).toContain('émojis 🎉');
      expect(result.tags).toContain('émoji-tag-🎉');
    });

    it('should handle very long strings', () => {
      const longString = 'A'.repeat(10000);
      const inputWithLongString = {
        title: 'Test Post',
        content: longString
      };

      // Should not throw for long content
      const result = CreatePostSchema.parse(inputWithLongString);
      expect(result.content).toBe(longString);
    });
  });
});