import { 
  CallToolRequest, 
  CallToolResult, 
  Tool,
  TextContent,
  ErrorCode
} from '@modelcontextprotocol/sdk/types.js';

import { WordPressClient } from './wordpress-client.js';
import { 
  CreatePostSchema, 
  ReadPostSchema, 
  UpdatePostSchema, 
  ListPostsSchema, 
  DeletePostSchema,
  CreatePostInput,
  ReadPostInput,
  UpdatePostInput,
  ListPostsInput,
  DeletePostInput,
  WordPressPost
} from './types.js';

export class WordPressTools {
  constructor(private client: WordPressClient) {}

  listTools(): Tool[] {
    return [
      {
        name: 'wordpress_create_post',
        description: 'Create a new WordPress post or page',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'The title of the post'
            },
            content: {
              type: 'string',
              description: 'The content of the post (HTML or plain text)'
            },
            status: {
              type: 'string',
              enum: ['draft', 'publish', 'private'],
              default: 'draft',
              description: 'The status of the post'
            },
            type: {
              type: 'string',
              enum: ['post', 'page'],
              default: 'post',
              description: 'The type of content to create'
            },
            categories: {
              type: 'array',
              items: { type: 'number' },
              description: 'Array of category IDs'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of tag names'
            },
            featured_media: {
              type: 'number',
              description: 'Featured image ID'
            },
            excerpt: {
              type: 'string',
              description: 'Post excerpt'
            },
            meta: {
              type: 'object',
              description: 'Custom meta fields'
            }
          },
          required: ['title', 'content']
        }
      },
      {
        name: 'wordpress_read_post',
        description: 'Retrieve a WordPress post by ID or slug',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Post ID'
            },
            slug: {
              type: 'string',
              description: 'Post slug'
            },
            include_meta: {
              type: 'boolean',
              default: false,
              description: 'Include custom meta fields in response'
            },
            context: {
              type: 'string',
              enum: ['view', 'edit'],
              default: 'view',
              description: 'Response context'
            }
          }
        }
      },
      {
        name: 'wordpress_update_post',
        description: 'Update an existing WordPress post',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Post ID (required)'
            },
            title: {
              type: 'string',
              description: 'New post title'
            },
            content: {
              type: 'string',
              description: 'New post content'
            },
            status: {
              type: 'string',
              enum: ['draft', 'publish', 'private'],
              description: 'New post status'
            },
            categories: {
              type: 'array',
              items: { type: 'number' },
              description: 'Array of category IDs'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of tag names'
            },
            featured_media: {
              type: 'number',
              description: 'Featured image ID'
            },
            excerpt: {
              type: 'string',
              description: 'Post excerpt'
            },
            meta: {
              type: 'object',
              description: 'Custom meta fields'
            }
          },
          required: ['id']
        }
      },
      {
        name: 'wordpress_list_posts',
        description: 'List WordPress posts with optional filters',
        inputSchema: {
          type: 'object',
          properties: {
            per_page: {
              type: 'number',
              minimum: 1,
              maximum: 100,
              default: 10,
              description: 'Posts per page'
            },
            page: {
              type: 'number',
              minimum: 1,
              default: 1,
              description: 'Page number'
            },
            search: {
              type: 'string',
              description: 'Search term'
            },
            author: {
              type: 'number',
              description: 'Author ID'
            },
            categories: {
              type: 'array',
              items: { type: 'number' },
              description: 'Category IDs'
            },
            tags: {
              type: 'array',
              items: { type: 'number' },
              description: 'Tag IDs'
            },
            status: {
              type: 'string',
              description: 'Post status filter'
            },
            orderby: {
              type: 'string',
              enum: ['date', 'title', 'id'],
              default: 'date',
              description: 'Order posts by'
            },
            order: {
              type: 'string',
              enum: ['asc', 'desc'],
              default: 'desc',
              description: 'Order direction'
            },
            before: {
              type: 'string',
              description: 'ISO date string for before filter'
            },
            after: {
              type: 'string',
              description: 'ISO date string for after filter'
            }
          }
        }
      },
      {
        name: 'wordpress_delete_post',
        description: 'Delete a WordPress post',
        inputSchema: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'Post ID'
            },
            force: {
              type: 'boolean',
              default: false,
              description: 'Permanently delete (bypass trash)'
            }
          },
          required: ['id']
        }
      }
    ];
  }

  async callTool(request: CallToolRequest): Promise<CallToolResult> {
    try {
      switch (request.params.name) {
        case 'wordpress_create_post':
          return await this.createPost(request.params.arguments);
        case 'wordpress_read_post':
          return await this.readPost(request.params.arguments);
        case 'wordpress_update_post':
          return await this.updatePost(request.params.arguments);
        case 'wordpress_list_posts':
          return await this.listPosts(request.params.arguments);
        case 'wordpress_delete_post':
          return await this.deletePost(request.params.arguments);
        default:
          throw new Error(`Unknown tool: ${request.params.name}`);
      }
    } catch (error) {
      return {
        isError: true,
        content: [{
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`
        }]
      };
    }
  }

  private async createPost(args: any): Promise<CallToolResult> {
    try {
      // Validate input
      const input = CreatePostSchema.parse(args);
      
      // Call WordPress API
      const result = await this.client.createPost(input);
      
      const post = result.data;
      const response = `✅ Successfully created ${input.type}: **${post.title.rendered}**

📝 **Details:**
- ID: ${post.id}
- Status: ${post.status}
- Type: ${post.type}
- Published: ${new Date(post.date).toLocaleDateString()}
- URL: ${post.link}

${post.excerpt?.rendered ? `📄 **Excerpt:** ${post.excerpt.rendered.replace(/<[^>]*>/g, '')}` : ''}

The ${input.type} has been successfully created and is ${post.status === 'publish' ? 'live on your site' : `saved as a ${post.status}`}.`;

      return {
        content: [{
          type: 'text',
          text: response
        }]
      };
    } catch (error) {
      return {
        isError: true,
        content: [{
          type: 'text',
          text: `Failed to create post: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  private async readPost(args: any): Promise<CallToolResult> {
    try {
      // Validate input
      const input = ReadPostSchema.parse(args);
      
      // Call WordPress API
      const result = await this.client.readPost(input);
      
      const post = result.data;
      let response = `📖 **${post.title.rendered}** (ID: ${post.id})

📝 **Details:**
- Status: ${post.status}
- Type: ${post.type}
- Author: ${post.author}
- Published: ${new Date(post.date).toLocaleDateString()}
- Modified: ${new Date(post.modified).toLocaleDateString()}
- URL: ${post.link}

`;

      if (post.excerpt?.rendered) {
        response += `📄 **Excerpt:**\n${post.excerpt.rendered.replace(/<[^>]*>/g, '')}\n\n`;
      }

      response += `📝 **Content:**\n${post.content.rendered.replace(/<[^>]*>/g, '')}`;

      if (input.include_meta && post.meta && Object.keys(post.meta).length > 0) {
        response += `\n\n🔧 **Custom Fields:**\n`;
        for (const [key, value] of Object.entries(post.meta)) {
          response += `- ${key}: ${value}\n`;
        }
      }

      return {
        content: [{
          type: 'text',
          text: response
        }]
      };
    } catch (error) {
      return {
        isError: true,
        content: [{
          type: 'text',
          text: `Failed to read post: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  private async updatePost(args: any): Promise<CallToolResult> {
    try {
      // Validate input
      const input = UpdatePostSchema.parse(args);
      
      // Call WordPress API
      const result = await this.client.updatePost(input);
      
      const post = result.data;
      const response = `✅ Successfully updated ${post.type}: **${post.title.rendered}**

📝 **Details:**
- ID: ${post.id}
- Status: ${post.status}
- Type: ${post.type}
- Last Modified: ${new Date(post.modified).toLocaleDateString()}
- URL: ${post.link}

The ${post.type} has been successfully updated.`;

      return {
        content: [{
          type: 'text',
          text: response
        }]
      };
    } catch (error) {
      return {
        isError: true,
        content: [{
          type: 'text',
          text: `Failed to update post: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  private async listPosts(args: any): Promise<CallToolResult> {
    try {
      // Validate input
      const input = ListPostsSchema.parse(args);
      
      // Call WordPress API
      const result = await this.client.listPosts(input);
      
      const posts = result.data;
      const headers = result.headers;
      
      if (posts.length === 0) {
        return {
          content: [{
            type: 'text',
            text: 'No posts found matching your criteria.'
          }]
        };
      }

      let response = `📚 Found ${posts.length} post(s)`;
      if (headers['x-wp-totalpages']) {
        response += ` - Page ${input.page} of ${headers['x-wp-totalpages']}`;
      }
      response += ':\n\n';

      posts.forEach((post: WordPressPost, index: number) => {
        response += `${index + 1}. **${post.title.rendered}** (ID: ${post.id})\n`;
        response += `   Status: ${post.status} | Type: ${post.type}\n`;
        response += `   Published: ${new Date(post.date).toLocaleDateString()}\n`;
        response += `   URL: ${post.link}\n\n`;
      });

      return {
        content: [{
          type: 'text',
          text: response
        }]
      };
    } catch (error) {
      return {
        isError: true,
        content: [{
          type: 'text',
          text: `Failed to list posts: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }

  private async deletePost(args: any): Promise<CallToolResult> {
    try {
      // Validate input
      const input = DeletePostSchema.parse(args);
      
      // Call WordPress API
      const result = await this.client.deletePost(input);
      
      const deletionInfo = result.data;
      const response = `🗑️ Successfully deleted ${deletionInfo.previous.type}: **${deletionInfo.previous.title.rendered}**

📝 **Details:**
- ID: ${deletionInfo.previous.id}
- ${input.force ? 'Permanently deleted' : 'Moved to trash'}
- Former URL: ${deletionInfo.previous.link}

The ${deletionInfo.previous.type} has been ${input.force ? 'permanently deleted' : 'moved to trash'}.`;

      return {
        content: [{
          type: 'text',
          text: response
        }]
      };
    } catch (error) {
      return {
        isError: true,
        content: [{
          type: 'text',
          text: `Failed to delete post: ${error instanceof Error ? error.message : 'Unknown error'}`
        }]
      };
    }
  }
}