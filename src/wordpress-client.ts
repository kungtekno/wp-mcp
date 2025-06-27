import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { 
  WordPressConfig, 
  WordPressPost, 
  WordPressError, 
  WordPressAPIResponse,
  RateLimitState,
  CreatePostInput,
  ReadPostInput,
  UpdatePostInput,
  ListPostsInput,
  DeletePostInput
} from './types.js';

export class WordPressClient {
  private client: AxiosInstance;
  private config: WordPressConfig;
  private rateLimitState: RateLimitState;

  constructor(config: WordPressConfig) {
    this.config = config;
    this.rateLimitState = {
      requests: 0,
      resetTime: Date.now() + 60000, // Reset every minute
      isBlocked: false
    };

    // Create axios instance with authentication
    this.client = axios.create({
      baseURL: `${config.site_url}/wp-json/wp/v2`,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MCP-WordPress-Server/1.0.0'
      },
      auth: {
        username: config.username,
        password: config.app_password
      },
      httpsAgent: config.verify_ssl ? undefined : { rejectUnauthorized: false }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleApiError(error)
    );
  }

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    
    if (now >= this.rateLimitState.resetTime) {
      this.rateLimitState.requests = 0;
      this.rateLimitState.resetTime = now + 60000;
    }

    const rateLimit = this.config.rate_limit;
    if (rateLimit && this.rateLimitState.requests >= rateLimit.requests_per_minute) {
      const waitTime = this.rateLimitState.resetTime - now;
      throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
    }

    this.rateLimitState.requests++;
  }

  private handleApiError(error: AxiosError): never {
    let message = 'An unknown error occurred';
    let code = 'unknown_error';

    if (error.response) {
      const status = error.response.status;
      const data = error.response.data as any;

      switch (status) {
        case 401:
          message = 'Authentication failed. Please check your username and application password.';
          code = 'authentication_failed';
          break;
        case 403:
          message = 'Access forbidden. You may not have permission to perform this action.';
          code = 'forbidden';
          break;
        case 404:
          message = 'Resource not found. The requested post, page, or endpoint does not exist.';
          code = 'not_found';
          break;
        case 400:
          if (data?.message) {
            message = data.message;
            code = data.code || 'bad_request';
          } else {
            message = 'Bad request. Please check your input parameters.';
            code = 'bad_request';
          }
          break;
        case 429:
          message = 'Too many requests. Please slow down your API calls.';
          code = 'too_many_requests';
          break;
        case 500:
          message = 'WordPress server error. Please try again later.';
          code = 'server_error';
          break;
        default:
          message = data?.message || `HTTP ${status}: ${error.message}`;
          code = data?.code || 'http_error';
      }
    } else if (error.request) {
      message = 'Network error. Please check your internet connection and WordPress site URL.';
      code = 'network_error';
    } else {
      message = error.message;
      code = 'request_error';
    }

    const wpError: WordPressError = {
      code,
      message,
      data: error.response ? {
        status: error.response.status,
        params: {}
      } : {
        status: 0,
        params: {}
      }
    };

    throw wpError;
  }

  async testConnection(): Promise<WordPressAPIResponse<{ authenticated: boolean }>> {
    try {
      await this.checkRateLimit();
      const response = await this.client.get('/users/me');
      return { 
        data: { authenticated: true },
        status: response.status,
        headers: this.extractHeaders(response)
      };
    } catch (error) {
      throw error;
    }
  }

  async createPost(input: CreatePostInput): Promise<WordPressAPIResponse<WordPressPost>> {
    try {
      await this.checkRateLimit();
      
      const postData: any = {
        title: input.title,
        content: input.content,
        status: input.status,
        type: input.type || 'post'
      };

      if (input.categories) postData.categories = input.categories;
      if (input.tags) postData.tags = input.tags;
      if (input.featured_media) postData.featured_media = input.featured_media;
      if (input.excerpt) postData.excerpt = input.excerpt;
      if (input.meta) postData.meta = input.meta;

      const response = await this.client.post('/posts', postData);
      
      return { 
        data: response.data,
        status: response.status,
        headers: this.extractHeaders(response)
      };
    } catch (error) {
      throw error;
    }
  }

  async readPost(input: ReadPostInput): Promise<WordPressAPIResponse<WordPressPost>> {
    try {
      await this.checkRateLimit();
      
      let endpoint = '/posts';
      const params: any = {
        context: input.context || 'view'
      };

      if (input.id) {
        endpoint = `/posts/${input.id}`;
      } else if (input.slug) {
        params.slug = input.slug;
      }

      if (input.include_meta) {
        params._fields = 'id,date,modified,slug,status,type,link,title,content,excerpt,author,featured_media,categories,tags,meta';
      }

      const response = await this.client.get(endpoint, { params });
      
      // If searching by slug, the response is an array
      const data = Array.isArray(response.data) ? response.data[0] : response.data;
      
      if (!data) {
        throw {
          code: 'not_found',
          message: `Post not found with ${input.id ? 'ID' : 'slug'}: ${input.id || input.slug}`
        };
      }

      return { 
        data,
        status: response.status,
        headers: this.extractHeaders(response)
      };
    } catch (error) {
      throw error;
    }
  }

  async updatePost(input: UpdatePostInput): Promise<WordPressAPIResponse<WordPressPost>> {
    try {
      await this.checkRateLimit();
      
      const updateData: any = {};
      
      if (input.title !== undefined) updateData.title = input.title;
      if (input.content !== undefined) updateData.content = input.content;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.categories !== undefined) updateData.categories = input.categories;
      if (input.tags !== undefined) updateData.tags = input.tags;
      if (input.featured_media !== undefined) updateData.featured_media = input.featured_media;
      if (input.excerpt !== undefined) updateData.excerpt = input.excerpt;
      if (input.meta !== undefined) updateData.meta = input.meta;

      const response = await this.client.post(`/posts/${input.id}`, updateData);
      
      return { 
        data: response.data,
        status: response.status,
        headers: this.extractHeaders(response)
      };
    } catch (error) {
      throw error;
    }
  }

  async listPosts(input: ListPostsInput): Promise<WordPressAPIResponse<WordPressPost[]>> {
    try {
      await this.checkRateLimit();
      
      const params: any = {
        per_page: input.per_page,
        page: input.page,
        orderby: input.orderby,
        order: input.order
      };

      if (input.search) params.search = input.search;
      if (input.author) params.author = input.author;
      if (input.categories) params.categories = input.categories.join(',');
      if (input.tags) params.tags = input.tags.join(',');
      if (input.status) params.status = input.status;
      if (input.before) params.before = input.before;
      if (input.after) params.after = input.after;

      const response = await this.client.get('/posts', { params });
      
      return { 
        data: response.data,
        status: response.status,
        headers: this.extractHeaders(response)
      };
    } catch (error) {
      throw error;
    }
  }

  async deletePost(input: DeletePostInput): Promise<WordPressAPIResponse<{ deleted: boolean; previous: WordPressPost }>> {
    try {
      await this.checkRateLimit();
      
      const params: any = {};
      if (input.force) params.force = true;

      const response = await this.client.delete(`/posts/${input.id}`, { params });
      
      return { 
        data: response.data,
        status: response.status,
        headers: this.extractHeaders(response)
      };
    } catch (error) {
      throw error;
    }
  }

  private extractHeaders(response: AxiosResponse): Record<string, string> {
    const relevantHeaders: Record<string, string> = {};
    
    // Extract pagination headers
    if (response.headers['x-wp-total']) {
      relevantHeaders['x-wp-total'] = response.headers['x-wp-total'];
    }
    if (response.headers['x-wp-totalpages']) {
      relevantHeaders['x-wp-totalpages'] = response.headers['x-wp-totalpages'];
    }
    
    return relevantHeaders;
  }
}