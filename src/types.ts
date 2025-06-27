import { z } from 'zod';

// Configuration Types
export const WordPressConfigSchema = z.object({
  site_url: z.string().url('Site URL must be a valid URL'),
  username: z.string().min(1, 'Username is required'),
  app_password: z.string().min(1, 'Application password is required'),
  verify_ssl: z.boolean().default(true),
  timeout: z.number().positive().default(30000),
  rate_limit: z.object({
    requests_per_minute: z.number().positive().default(60),
    burst_limit: z.number().positive().default(10)
  }).optional()
});

export type WordPressConfig = z.infer<typeof WordPressConfigSchema>;

// Authentication Types
export interface AuthState {
  isAuthenticated: boolean;
  lastVerified: Date | null;
  credentials: {
    username: string;
    password: string; // Base64 encoded for HTTP Basic Auth
  } | null;
}

export interface WordPressUser {
  id: number;
  username: string;
  name: string;
  email: string;
  url: string;
  description: string;
  link: string;
  slug: string;
  avatar_urls: Record<string, string>;
  roles: string[];
  capabilities: Record<string, boolean>;
}

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
  status: 'publish' | 'draft' | 'private' | 'pending' | 'trash';
  type: string;
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
  categories: number[];
  tags: number[];
  meta: Record<string, any>;
}

export interface HttpClientConfig {
  baseURL: string;
  timeout: number;
  headers: Record<string, string>;
  httpsAgent?: any;
}

export interface RateLimitConfig {
  requests_per_minute: number;
  burst_limit: number;
  window_ms: number;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: {
    site_url: string;
    wordpress_version?: string;
    user_info?: Partial<WordPressUser>;
    api_endpoints?: string[];
    security_warnings?: string[];
  };
  error?: {
    code: string;
    message: string;
    http_status?: number;
  };
}

export interface SecurityValidationResult {
  isSecure: boolean;
  issues: string[];
  warnings: string[];
}

export enum AuthErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  INVALID_URL = 'INVALID_URL',
  SSL_ERROR = 'SSL_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export class WordPressAuthError extends Error {
  constructor(
    public type: AuthErrorType,
    message: string,
    public httpStatus?: number,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'WordPressAuthError';
  }
}

// MCP Tool Input Schemas
export const CreatePostSchema = z.object({
  title: z.string().min(1),
  content: z.string(),
  status: z.enum(['draft', 'publish', 'private']).default('draft'),
  type: z.enum(['post', 'page']).default('post'),
  categories: z.array(z.number()).optional(),
  tags: z.array(z.string()).optional(),
  featured_media: z.number().optional(),
  excerpt: z.string().optional(),
  meta: z.record(z.any()).optional()
});

export const ReadPostSchema = z.object({
  id: z.number().optional(),
  slug: z.string().optional(),
  include_meta: z.boolean().default(false),
  context: z.enum(['view', 'edit']).default('view')
}).refine(data => data.id !== undefined || data.slug !== undefined, {
  message: "Either 'id' or 'slug' must be provided"
});

export const UpdatePostSchema = z.object({
  id: z.number().min(1),
  title: z.string().optional(),
  content: z.string().optional(),
  status: z.enum(['draft', 'publish', 'private']).optional(),
  categories: z.array(z.number()).optional(),
  tags: z.array(z.string()).optional(),
  featured_media: z.number().optional(),
  excerpt: z.string().optional(),
  meta: z.record(z.any()).optional()
});

export const ListPostsSchema = z.object({
  per_page: z.number().min(1).max(100).default(10),
  page: z.number().min(1).default(1),
  search: z.string().optional(),
  author: z.number().optional(),
  categories: z.array(z.number()).optional(),
  tags: z.array(z.number()).optional(),
  status: z.string().optional(),
  orderby: z.enum(['date', 'title', 'id']).default('date'),
  order: z.enum(['asc', 'desc']).default('desc'),
  before: z.string().optional(),
  after: z.string().optional()
});

export const DeletePostSchema = z.object({
  id: z.number().min(1),
  force: z.boolean().default(false)
});

export const UploadMediaSchema = z.object({
  file_path: z.string().min(1),
  title: z.string().optional(),
  alt_text: z.string().optional(),
  caption: z.string().optional(),
  description: z.string().optional(),
  post_id: z.number().optional()
});

export const GetMediaSchema = z.object({
  id: z.number().optional(),
  search: z.string().optional(),
  per_page: z.number().min(1).max(100).default(10),
  page: z.number().min(1).default(1),
  mime_type: z.string().optional()
});

export const ManageCategoriesSchema = z.object({
  action: z.enum(['create', 'read', 'update', 'delete', 'list']),
  id: z.number().optional(),
  name: z.string().optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
  parent: z.number().optional()
});

export const ManageTagsSchema = z.object({
  action: z.enum(['create', 'read', 'update', 'delete', 'list']),
  id: z.number().optional(),
  name: z.string().optional(),
  slug: z.string().optional(),
  description: z.string().optional()
});

// MCP Response Types
export interface MCPToolResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

export interface MCPErrorResponse extends MCPToolResponse {
  isError: true;
  code?: string;
}

// WordPress API Response Types
export interface WordPressAPIResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

export interface WordPressError {
  code: string;
  message: string;
  data: {
    status: number;
    params?: Record<string, any>;
  };
}

// Authentication Types
export interface AuthenticationResult {
  success: boolean;
  user?: {
    id: number;
    name: string;
    email: string;
    roles: string[];
  };
  error?: string;
}

// Rate Limiting Types
export interface RateLimitState {
  requests: number;
  resetTime: number;
  isBlocked: boolean;
}

// Export individual input types for easier use
export type CreatePostInput = z.infer<typeof CreatePostSchema>;
export type ReadPostInput = z.infer<typeof ReadPostSchema>;
export type UpdatePostInput = z.infer<typeof UpdatePostSchema>;
export type ListPostsInput = z.infer<typeof ListPostsSchema>;
export type DeletePostInput = z.infer<typeof DeletePostSchema>;
export type UploadMediaInput = z.infer<typeof UploadMediaSchema>;
export type GetMediaInput = z.infer<typeof GetMediaSchema>;
export type ManageCategoriesInput = z.infer<typeof ManageCategoriesSchema>;
export type ManageTagsInput = z.infer<typeof ManageTagsSchema>;

export type ToolInputs = {
  wordpress_create_post: CreatePostInput;
  wordpress_read_post: ReadPostInput;
  wordpress_update_post: UpdatePostInput;
  wordpress_list_posts: ListPostsInput;
  wordpress_delete_post: DeletePostInput;
  wordpress_upload_media: UploadMediaInput;
  wordpress_get_media: GetMediaInput;
  wordpress_manage_categories: ManageCategoriesInput;
  wordpress_manage_tags: ManageTagsInput;
};