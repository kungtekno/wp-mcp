import { AxiosResponse } from 'axios';

// WordPress API Response Types
export interface WordPressPost {
  id: number;
  date: string;
  date_gmt: string;
  guid: {
    rendered: string;
  };
  modified: string;
  modified_gmt: string;
  slug: string;
  status: 'publish' | 'draft' | 'private' | 'pending' | 'future';
  type: 'post' | 'page';
  link: string;
  title: {
    rendered: string;
  };
  content: {
    rendered: string;
    protected: boolean;
  };
  excerpt: {
    rendered: string;
    protected: boolean;
  };
  author: number;
  featured_media: number;
  comment_status: 'open' | 'closed';
  ping_status: 'open' | 'closed';
  sticky: boolean;
  template: string;
  format: string;
  meta: Record<string, any>;
  categories: number[];
  tags: number[];
  _links: {
    self: Array<{ href: string }>;
    collection: Array<{ href: string }>;
    about: Array<{ href: string }>;
    author: Array<{ embeddable: boolean; href: string }>;
    replies: Array<{ embeddable: boolean; href: string }>;
    'version-history': Array<{ count: number; href: string }>;
    'wp:attachment': Array<{ href: string }>;
    'wp:term': Array<{ taxonomy: string; embeddable: boolean; href: string }>;
    curies: Array<{ name: string; href: string; templated: boolean }>;
  };
}

export interface WordPressCategory {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
  parent: number;
  meta: Record<string, any>;
  _links: {
    self: Array<{ href: string }>;
    collection: Array<{ href: string }>;
    about: Array<{ href: string }>;
    'wp:post_type': Array<{ href: string }>;
    curies: Array<{ name: string; href: string; templated: boolean }>;
  };
}

export interface WordPressTag {
  id: number;
  count: number;
  description: string;
  link: string;
  name: string;
  slug: string;
  taxonomy: string;
  meta: Record<string, any>;
  _links: {
    self: Array<{ href: string }>;
    collection: Array<{ href: string }>;
    about: Array<{ href: string }>;
    'wp:post_type': Array<{ href: string }>;
    curies: Array<{ name: string; href: string; templated: boolean }>;
  };
}

export interface WordPressMedia {
  id: number;
  date: string;
  date_gmt: string;
  guid: {
    rendered: string;
  };
  modified: string;
  modified_gmt: string;
  slug: string;
  status: string;
  type: string;
  link: string;
  title: {
    rendered: string;
  };
  author: number;
  comment_status: string;
  ping_status: string;
  template: string;
  meta: Record<string, any>;
  description: {
    rendered: string;
  };
  caption: {
    rendered: string;
  };
  alt_text: string;
  media_type: string;
  mime_type: string;
  media_details: {
    width: number;
    height: number;
    file: string;
    sizes: Record<string, {
      file: string;
      width: number;
      height: number;
      mime_type: string;
      source_url: string;
    }>;
  };
  post: number;
  source_url: string;
  _links: {
    self: Array<{ href: string }>;
    collection: Array<{ href: string }>;
    about: Array<{ href: string }>;
    author: Array<{ embeddable: boolean; href: string }>;
    replies: Array<{ embeddable: boolean; href: string }>;
  };
}

export interface WordPressUser {
  id: number;
  name: string;
  url: string;
  description: string;
  link: string;
  slug: string;
  avatar_urls: Record<string, string>;
  meta: Record<string, any>;
  _links: {
    self: Array<{ href: string }>;
    collection: Array<{ href: string }>;
  };
}

export interface WordPressComment {
  id: number;
  post: number;
  parent: number;
  author: number;
  author_name: string;
  author_url: string;
  date: string;
  date_gmt: string;
  content: {
    rendered: string;
  };
  link: string;
  status: string;
  type: string;
  author_avatar_urls: Record<string, string>;
  meta: Record<string, any>;
  _links: {
    self: Array<{ href: string }>;
    collection: Array<{ href: string }>;
    up: Array<{ embeddable: boolean; post_type: string; href: string }>;
  };
}

export interface WordPressError {
  code: string;
  message: string;
  data: {
    status: number;
    params?: Record<string, any>;
  };
}

// Mock Data Generators
export class WordPressMockData {
  static createPost(overrides: Partial<WordPressPost> = {}): WordPressPost {
    const defaultPost: WordPressPost = {
      id: 1,
      date: '2024-01-01T12:00:00',
      date_gmt: '2024-01-01T12:00:00',
      guid: {
        rendered: 'https://example.com/?p=1'
      },
      modified: '2024-01-01T12:00:00',
      modified_gmt: '2024-01-01T12:00:00',
      slug: 'sample-post',
      status: 'publish',
      type: 'post',
      link: 'https://example.com/sample-post/',
      title: {
        rendered: 'Sample Post'
      },
      content: {
        rendered: '<p>This is a sample post content.</p>',
        protected: false
      },
      excerpt: {
        rendered: '<p>This is a sample excerpt.</p>',
        protected: false
      },
      author: 1,
      featured_media: 0,
      comment_status: 'open',
      ping_status: 'open',
      sticky: false,
      template: '',
      format: 'standard',
      meta: {},
      categories: [1],
      tags: [1],
      _links: {
        self: [{ href: 'https://example.com/wp-json/wp/v2/posts/1' }],
        collection: [{ href: 'https://example.com/wp-json/wp/v2/posts' }],
        about: [{ href: 'https://example.com/wp-json/wp/v2/types/post' }],
        author: [{ embeddable: true, href: 'https://example.com/wp-json/wp/v2/users/1' }],
        replies: [{ embeddable: true, href: 'https://example.com/wp-json/wp/v2/comments?post=1' }],
        'version-history': [{ count: 1, href: 'https://example.com/wp-json/wp/v2/posts/1/revisions' }],
        'wp:attachment': [{ href: 'https://example.com/wp-json/wp/v2/media?parent=1' }],
        'wp:term': [
          { taxonomy: 'category', embeddable: true, href: 'https://example.com/wp-json/wp/v2/categories?post=1' },
          { taxonomy: 'post_tag', embeddable: true, href: 'https://example.com/wp-json/wp/v2/tags?post=1' }
        ],
        curies: [{ name: 'wp', href: 'https://api.w.org/{rel}', templated: true }]
      }
    };

    return { ...defaultPost, ...overrides };
  }

  static createCategory(overrides: Partial<WordPressCategory> = {}): WordPressCategory {
    const defaultCategory: WordPressCategory = {
      id: 1,
      count: 5,
      description: 'Sample category description',
      link: 'https://example.com/category/sample/',
      name: 'Sample Category',
      slug: 'sample-category',
      taxonomy: 'category',
      parent: 0,
      meta: {},
      _links: {
        self: [{ href: 'https://example.com/wp-json/wp/v2/categories/1' }],
        collection: [{ href: 'https://example.com/wp-json/wp/v2/categories' }],
        about: [{ href: 'https://example.com/wp-json/wp/v2/taxonomies/category' }],
        'wp:post_type': [{ href: 'https://example.com/wp-json/wp/v2/posts?categories=1' }],
        curies: [{ name: 'wp', href: 'https://api.w.org/{rel}', templated: true }]
      }
    };

    return { ...defaultCategory, ...overrides };
  }

  static createTag(overrides: Partial<WordPressTag> = {}): WordPressTag {
    const defaultTag: WordPressTag = {
      id: 1,
      count: 3,
      description: 'Sample tag description',
      link: 'https://example.com/tag/sample/',
      name: 'Sample Tag',
      slug: 'sample-tag',
      taxonomy: 'post_tag',
      meta: {},
      _links: {
        self: [{ href: 'https://example.com/wp-json/wp/v2/tags/1' }],
        collection: [{ href: 'https://example.com/wp-json/wp/v2/tags' }],
        about: [{ href: 'https://example.com/wp-json/wp/v2/taxonomies/post_tag' }],
        'wp:post_type': [{ href: 'https://example.com/wp-json/wp/v2/posts?tags=1' }],
        curies: [{ name: 'wp', href: 'https://api.w.org/{rel}', templated: true }]
      }
    };

    return { ...defaultTag, ...overrides };
  }

  static createMedia(overrides: Partial<WordPressMedia> = {}): WordPressMedia {
    const defaultMedia: WordPressMedia = {
      id: 1,
      date: '2024-01-01T12:00:00',
      date_gmt: '2024-01-01T12:00:00',
      guid: {
        rendered: 'https://example.com/wp-content/uploads/2024/01/sample-image.jpg'
      },
      modified: '2024-01-01T12:00:00',
      modified_gmt: '2024-01-01T12:00:00',
      slug: 'sample-image',
      status: 'inherit',
      type: 'attachment',
      link: 'https://example.com/sample-image/',
      title: {
        rendered: 'Sample Image'
      },
      author: 1,
      comment_status: 'open',
      ping_status: 'closed',
      template: '',
      meta: {},
      description: {
        rendered: '<p>Sample image description</p>'
      },
      caption: {
        rendered: '<p>Sample image caption</p>'
      },
      alt_text: 'Sample image alt text',
      media_type: 'image',
      mime_type: 'image/jpeg',
      media_details: {
        width: 1920,
        height: 1080,
        file: '2024/01/sample-image.jpg',
        sizes: {
          thumbnail: {
            file: 'sample-image-150x150.jpg',
            width: 150,
            height: 150,
            mime_type: 'image/jpeg',
            source_url: 'https://example.com/wp-content/uploads/2024/01/sample-image-150x150.jpg'
          },
          medium: {
            file: 'sample-image-300x169.jpg',
            width: 300,
            height: 169,
            mime_type: 'image/jpeg',
            source_url: 'https://example.com/wp-content/uploads/2024/01/sample-image-300x169.jpg'
          },
          large: {
            file: 'sample-image-1024x576.jpg',
            width: 1024,
            height: 576,
            mime_type: 'image/jpeg',
            source_url: 'https://example.com/wp-content/uploads/2024/01/sample-image-1024x576.jpg'
          },
          full: {
            file: 'sample-image.jpg',
            width: 1920,
            height: 1080,
            mime_type: 'image/jpeg',
            source_url: 'https://example.com/wp-content/uploads/2024/01/sample-image.jpg'
          }
        }
      },
      post: 0,
      source_url: 'https://example.com/wp-content/uploads/2024/01/sample-image.jpg',
      _links: {
        self: [{ href: 'https://example.com/wp-json/wp/v2/media/1' }],
        collection: [{ href: 'https://example.com/wp-json/wp/v2/media' }],
        about: [{ href: 'https://example.com/wp-json/wp/v2/types/attachment' }],
        author: [{ embeddable: true, href: 'https://example.com/wp-json/wp/v2/users/1' }],
        replies: [{ embeddable: true, href: 'https://example.com/wp-json/wp/v2/comments?post=1' }]
      }
    };

    return { ...defaultMedia, ...overrides };
  }

  static createUser(overrides: Partial<WordPressUser> = {}): WordPressUser {
    const defaultUser: WordPressUser = {
      id: 1,
      name: 'John Doe',
      url: 'https://johndoe.com',
      description: 'WordPress user description',
      link: 'https://example.com/author/johndoe/',
      slug: 'johndoe',
      avatar_urls: {
        '24': 'https://secure.gravatar.com/avatar/hash?s=24&d=mm&r=g',
        '48': 'https://secure.gravatar.com/avatar/hash?s=48&d=mm&r=g',
        '96': 'https://secure.gravatar.com/avatar/hash?s=96&d=mm&r=g'
      },
      meta: {},
      _links: {
        self: [{ href: 'https://example.com/wp-json/wp/v2/users/1' }],
        collection: [{ href: 'https://example.com/wp-json/wp/v2/users' }]
      }
    };

    return { ...defaultUser, ...overrides };
  }

  static createComment(overrides: Partial<WordPressComment> = {}): WordPressComment {
    const defaultComment: WordPressComment = {
      id: 1,
      post: 1,
      parent: 0,
      author: 1,
      author_name: 'John Doe',
      author_url: 'https://johndoe.com',
      date: '2024-01-01T12:00:00',
      date_gmt: '2024-01-01T12:00:00',
      content: {
        rendered: '<p>This is a sample comment.</p>'
      },
      link: 'https://example.com/sample-post/#comment-1',
      status: 'approved',
      type: 'comment',
      author_avatar_urls: {
        '24': 'https://secure.gravatar.com/avatar/hash?s=24&d=mm&r=g',
        '48': 'https://secure.gravatar.com/avatar/hash?s=48&d=mm&r=g',
        '96': 'https://secure.gravatar.com/avatar/hash?s=96&d=mm&r=g'
      },
      meta: {},
      _links: {
        self: [{ href: 'https://example.com/wp-json/wp/v2/comments/1' }],
        collection: [{ href: 'https://example.com/wp-json/wp/v2/comments' }],
        up: [{ embeddable: true, post_type: 'post', href: 'https://example.com/wp-json/wp/v2/posts/1' }]
      }
    };

    return { ...defaultComment, ...overrides };
  }

  static createError(overrides: Partial<WordPressError> = {}): WordPressError {
    const defaultError: WordPressError = {
      code: 'rest_post_invalid_id',
      message: 'Invalid post ID.',
      data: {
        status: 404
      }
    };

    return { ...defaultError, ...overrides };
  }
}

// Mock Axios Response Helper
export function createMockAxiosResponse<T>(data: T, status = 200, headers = {}): AxiosResponse<T> {
  return {
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers,
    config: {} as any,
    request: {}
  };
}

// Common WordPress API Error Responses
export const WORDPRESS_ERRORS = {
  INVALID_CREDENTIALS: WordPressMockData.createError({
    code: 'rest_cannot_access',
    message: 'Sorry, you are not allowed to do that.',
    data: { status: 401 }
  }),
  INVALID_POST_ID: WordPressMockData.createError({
    code: 'rest_post_invalid_id',
    message: 'Invalid post ID.',
    data: { status: 404 }
  }),
  INVALID_CATEGORY_ID: WordPressMockData.createError({
    code: 'rest_term_invalid',
    message: 'Term does not exist.',
    data: { status: 404 }
  }),
  INVALID_TAG_ID: WordPressMockData.createError({
    code: 'rest_term_invalid',
    message: 'Term does not exist.',
    data: { status: 404 }
  }),
  INVALID_MEDIA_ID: WordPressMockData.createError({
    code: 'rest_post_invalid_id',
    message: 'Invalid media ID.',
    data: { status: 404 }
  }),
  INVALID_USER_ID: WordPressMockData.createError({
    code: 'rest_user_invalid_id',
    message: 'Invalid user ID.',
    data: { status: 404 }
  }),
  PERMISSION_DENIED: WordPressMockData.createError({
    code: 'rest_cannot_edit',
    message: 'Sorry, you are not allowed to edit this post.',
    data: { status: 403 }
  }),
  INVALID_INPUT: WordPressMockData.createError({
    code: 'rest_invalid_param',
    message: 'Invalid parameter(s): title',
    data: { status: 400, params: { title: 'Title is required.' } }
  }),
  SERVER_ERROR: WordPressMockData.createError({
    code: 'rest_server_error',
    message: 'Internal server error.',
    data: { status: 500 }
  }),
  RATE_LIMITED: WordPressMockData.createError({
    code: 'rest_rate_limited',
    message: 'Too many requests. Please try again later.',
    data: { status: 429 }
  })
};